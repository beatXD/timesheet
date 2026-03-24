import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User, Timesheet, Notification } from "@/models";
import { notifyDeadlineReminder } from "@/lib/notifications";
import { getDeadlineStatusTH } from "@/lib/deadline";
import { verifyCronSecret } from "@/lib/cron";

// GET /api/cron/deadline-reminder
export async function GET(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Calculate current month/year in Bangkok timezone
    const nowUTC = new Date();
    const bangkokOffset = 7 * 60 * 60 * 1000;
    const bangkokNow = new Date(nowUTC.getTime() + bangkokOffset);
    const currentMonth = bangkokNow.getMonth() + 1;
    const currentYear = bangkokNow.getFullYear();

    // Check if we should send reminders today
    const { daysLeft } = getDeadlineStatusTH(currentMonth, currentYear);

    // Only send reminders at 3 days and 1 day before deadline
    if (daysLeft !== 3 && daysLeft !== 1) {
      return NextResponse.json({
        data: {
          message: `No reminder needed today (${daysLeft} days left)`,
          sent: 0,
        },
      });
    }

    // Find all users (excluding super_admin)
    const users = await User.find({ role: { $in: ["admin", "user"] } }).lean();

    // Find timesheets for current month that are already submitted/approved/rejected
    const existingTimesheets = await Timesheet.find({
      month: currentMonth,
      year: currentYear,
      status: { $in: ["submitted", "approved", "rejected"] },
    }).lean();

    const submittedUserIds = new Set(
      existingTimesheets.map((ts) => String(ts.userId))
    );

    // Filter users who need reminders (no submitted/approved/rejected timesheet)
    const usersToRemind = users.filter(
      (user) => !submittedUserIds.has(String(user._id))
    );

    // Check for existing reminders to prevent duplicates
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existingReminders = await Notification.find({
      type: "deadline_reminder",
      "metadata.month": currentMonth,
      "metadata.year": currentYear,
      "metadata.reminderDaysLeft": daysLeft,
      createdAt: { $gte: oneDayAgo },
    }).lean();

    const alreadyRemindedUserIds = new Set(
      existingReminders.map((n) => String(n.userId))
    );

    let sent = 0;
    let skipped = 0;

    for (const user of usersToRemind) {
      const userId = String(user._id);
      if (alreadyRemindedUserIds.has(userId)) {
        skipped++;
        continue;
      }

      try {
        await notifyDeadlineReminder(userId, currentMonth, currentYear, daysLeft);
        sent++;
      } catch (err) {
        console.error(`[Cron] Failed to send reminder to ${userId}:`, err);
      }
    }

    return NextResponse.json({
      data: {
        message: `Deadline reminders sent (${daysLeft} days left)`,
        month: currentMonth,
        year: currentYear,
        daysLeft,
        sent,
        skipped,
        totalUsersToRemind: usersToRemind.length,
      },
    });
  } catch (error) {
    console.error("[Cron] Error in deadline-reminder:", error);
    return NextResponse.json(
      { error: "Failed to process deadline reminders" },
      { status: 500 }
    );
  }
}
