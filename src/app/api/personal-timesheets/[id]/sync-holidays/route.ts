import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { PersonalTimesheet, Holiday } from "@/models";
import { isWeekend, isSameDay } from "date-fns";

// POST /api/personal-timesheets/[id]/sync-holidays - Sync holidays into existing timesheet
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const timesheet = await PersonalTimesheet.findById(id);

    if (!timesheet) {
      return NextResponse.json(
        { error: "Personal timesheet not found" },
        { status: 404 }
      );
    }

    // Only owner can sync
    if (timesheet.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get holidays for this year
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const holidays: any[] = await Holiday.find({ year: timesheet.year }).lean();

    let updatedCount = 0;

    // Update entries with holiday info
    for (const entry of timesheet.entries) {
      const date = new Date(timesheet.year, timesheet.month - 1, entry.date);

      // Check if this date is a holiday
      const holiday = holidays.find((h) => isSameDay(new Date(h.date), date));

      if (holiday) {
        // Only update if not already marked as holiday
        if (entry.type !== "holiday") {
          entry.type = "holiday";
          entry.remark = holiday.name;
          entry.timeIn = "";
          entry.timeOut = "";
          entry.baseHours = 0;
          updatedCount++;
        }
      } else if (entry.type === "holiday") {
        // If marked as holiday but no holiday found, revert to working/weekend
        if (isWeekend(date)) {
          entry.type = "weekend";
          entry.timeIn = "";
          entry.timeOut = "";
          entry.baseHours = 0;
        } else {
          entry.type = "working";
          entry.timeIn = "09:00";
          entry.timeOut = "18:00";
          entry.baseHours = 8;
        }
        entry.remark = "";
        updatedCount++;
      }
    }

    // Recalculate total hours
    timesheet.totalBaseHours = timesheet.entries.reduce(
      (sum: number, e: { baseHours: number }) => sum + (e.baseHours || 0),
      0
    );

    await timesheet.save();

    return NextResponse.json({
      data: timesheet,
      message: `Synced ${updatedCount} entries with holidays`,
      updatedCount,
    });
  } catch (error) {
    console.error("Error syncing holidays:", error);
    return NextResponse.json(
      { error: "Failed to sync holidays" },
      { status: 500 }
    );
  }
}
