import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Timesheet, Team, AuditLog, User } from "@/models";
import { sendTimesheetStatusEmail } from "@/lib/email";
import { notifyTimesheetRejected } from "@/lib/notifications";
import { timesheetRejectSchema, validateRequest } from "@/lib/validation/schemas";

// POST /api/timesheets/[id]/reject - Reject timesheet
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only leaders can reject (admin is view-only now)
    if (session.user.role !== "leader") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;

    const body = await request.json();

    // Validate with Zod schema
    const validation = validateRequest(timesheetRejectSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { reason } = validation.data;

    const timesheet = await Timesheet.findById(id);

    if (!timesheet) {
      return NextResponse.json(
        { error: "Timesheet not found" },
        { status: 404 }
      );
    }

    // Can only reject submitted timesheets
    if (timesheet.status !== "submitted") {
      return NextResponse.json(
        { error: "Can only reject submitted timesheets" },
        { status: 400 }
      );
    }

    // Check if timesheet belongs to leader's team(s) or is their own
    const isOwnTimesheet = timesheet.userId.toString() === session.user.id;

    if (!isOwnTimesheet) {
      const teams = await Team.find({ leaderId: session.user.id });
      const allMemberIds = teams.flatMap((t: { memberIds: { toString: () => string }[] }) =>
        t.memberIds.map((id) => id.toString())
      );
      if (!allMemberIds.includes(timesheet.userId.toString())) {
        return NextResponse.json(
          { error: "Can only reject timesheets from your team" },
          { status: 403 }
        );
      }
    }

    // Reject timesheet
    const previousStatus = timesheet.status;
    timesheet.status = "rejected";
    timesheet.rejectedReason = reason;
    // Clear approval fields
    timesheet.approvedAt = undefined;
    timesheet.approvedBy = undefined;
    timesheet.submittedAt = undefined;

    await timesheet.save();

    // Log the rejection
    await AuditLog.logAction({
      entityType: "timesheet",
      entityId: timesheet._id,
      action: "reject",
      fromStatus: previousStatus,
      toStatus: "rejected",
      performedBy: session.user.id,
      reason,
    });

    // Send email notification
    try {
      const timesheetUser = await User.findById(timesheet.userId).lean();
      if (timesheetUser?.email) {
        await sendTimesheetStatusEmail({
          to: timesheetUser.email,
          userName: timesheetUser.name || "User",
          month: timesheet.month,
          year: timesheet.year,
          status: "rejected",
          reviewerName: session.user.name || "Manager",
          rejectionReason: reason,
        });
      }
    } catch (emailError) {
      console.error("Failed to send timesheet status email:", emailError);
      // Don't fail the request if email fails
    }

    // Send in-app notification
    try {
      await notifyTimesheetRejected(
        timesheet.userId.toString(),
        timesheet.month,
        timesheet.year,
        reason
      );
    } catch (notifError) {
      console.error("Failed to send notification:", notifError);
    }

    return NextResponse.json({ data: timesheet });
  } catch (error) {
    console.error("Error rejecting timesheet:", error);
    return NextResponse.json(
      { error: "Failed to reject timesheet" },
      { status: 500 }
    );
  }
}
