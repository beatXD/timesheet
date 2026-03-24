import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Timesheet, Team, User } from "@/models";
import { sendTimesheetStatusEmail } from "@/lib/email";
import { notifyTimesheetApproved } from "@/lib/notifications";

const MAX_BULK_SIZE = 50;

// POST /api/team/timesheets/bulk-approve
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { timesheetIds } = await request.json();

    if (!Array.isArray(timesheetIds) || timesheetIds.length === 0) {
      return NextResponse.json(
        { error: "timesheetIds must be a non-empty array" },
        { status: 400 }
      );
    }

    if (timesheetIds.length > MAX_BULK_SIZE) {
      return NextResponse.json(
        { error: `Maximum ${MAX_BULK_SIZE} timesheets per request` },
        { status: 400 }
      );
    }

    await connectDB();

    // Get leader's teams once
    const teams = await Team.find({ adminId: session.user.id });
    const allMemberIds = teams.flatMap((t: { memberIds: { toString: () => string }[] }) =>
      t.memberIds.map((id) => id.toString())
    );

    const approvedIds: string[] = [];
    const errors: string[] = [];

    for (const tsId of timesheetIds) {
      try {
        const timesheet = await Timesheet.findById(tsId);

        if (!timesheet) {
          errors.push(`${tsId}: not found`);
          continue;
        }

        if (timesheet.status !== "submitted") {
          errors.push(`${tsId}: status is ${timesheet.status}, not submitted`);
          continue;
        }

        // Check authorization
        const isOwnTimesheet = timesheet.userId.toString() === session.user.id;
        if (!isOwnTimesheet && !allMemberIds.includes(timesheet.userId.toString())) {
          errors.push(`${tsId}: not in your team`);
          continue;
        }

        // Approve
        timesheet.status = "approved";
        timesheet.approvedAt = new Date();
        timesheet.approvedBy = session.user.id as any;
        await timesheet.save();
        approvedIds.push(tsId);

        // Send email (non-blocking)
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
          console.error(`Failed to send email for ${tsId}:`, emailError);
        }

        // Send in-app notification (non-blocking)
        try {
          await notifyTimesheetApproved(
            timesheet.userId.toString(),
            timesheet.month,
            timesheet.year
          );
        } catch (notifError) {
          console.error(`Failed to send notification for ${tsId}:`, notifError);
        }
      } catch (err) {
        console.error(`Error processing ${tsId}:`, err);
        errors.push(`${tsId}: internal error`);
      }
    }

    return NextResponse.json({
      data: {
        approved: approvedIds.length,
        failed: errors.length,
        approvedIds,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error("Error in bulk approve:", error);
    return NextResponse.json(
      { error: "Failed to bulk approve timesheets" },
      { status: 500 }
    );
  }
}
