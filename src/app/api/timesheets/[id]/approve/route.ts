import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Timesheet, Team, User } from "@/models";
import { sendTimesheetStatusEmail } from "@/lib/email";
import { notifyTimesheetApproved } from "@/lib/notifications";
import { logActivity } from "@/lib/activity-log";

// POST /api/timesheets/[id]/approve - Approve timesheet
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only team admins can approve timesheets (super_admin is view-only)
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;

    const timesheet = await Timesheet.findById(id);

    if (!timesheet) {
      return NextResponse.json(
        { error: "Timesheet not found" },
        { status: 404 }
      );
    }

    // Can only approve submitted timesheets
    if (timesheet.status !== "submitted") {
      return NextResponse.json(
        { error: "Can only approve submitted timesheets" },
        { status: 400 }
      );
    }

    // Check if timesheet belongs to leader's team(s) or is their own
    const isOwnTimesheet = timesheet.userId.toString() === session.user.id;

    if (!isOwnTimesheet) {
      const teams = await Team.find({ adminId: session.user.id });
      const allMemberIds = teams.flatMap((t: { memberIds: { toString: () => string }[] }) =>
        t.memberIds.map((id) => id.toString())
      );
      if (!allMemberIds.includes(timesheet.userId.toString())) {
        return NextResponse.json(
          { error: "Can only approve timesheets from your team" },
          { status: 403 }
        );
      }
    }

    const previousStatus = timesheet.status;
    timesheet.status = "approved";
    timesheet.approvedAt = new Date();
    timesheet.approvedBy = session.user.id as any;

    await timesheet.save();

    // Send email notification
    try {
      const timesheetUser = await User.findById(timesheet.userId).lean();
      if (timesheetUser?.email) {
        await sendTimesheetStatusEmail({
          to: timesheetUser.email,
          userName: timesheetUser.name || "User",
          month: timesheet.month,
          year: timesheet.year,
          status: "approved",
          reviewerName: session.user.name || "Manager",
        });
      }
    } catch (emailError) {
      console.error("Failed to send timesheet status email:", emailError);
      // Don't fail the request if email fails
    }

    // Send in-app notification
    try {
      await notifyTimesheetApproved(
        timesheet.userId.toString(),
        timesheet.month,
        timesheet.year
      );
    } catch (notifError) {
      console.error("Failed to send notification:", notifError);
    }

    logActivity({
      userId: session.user.id!,
      action: "timesheet_approved",
      targetType: "timesheet",
      targetId: timesheet._id.toString(),
      metadata: { month: timesheet.month, year: timesheet.year },
    });

    return NextResponse.json({ data: timesheet });
  } catch (error) {
    console.error("Error approving timesheet:", error);
    return NextResponse.json(
      { error: "Failed to approve timesheet" },
      { status: 500 }
    );
  }
}
