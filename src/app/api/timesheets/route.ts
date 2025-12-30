import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Timesheet, Holiday } from "@/models";
import {
  getDaysInMonth,
  isWeekend,
  startOfMonth,
  format,
  isSameDay,
} from "date-fns";
import type { ITimesheetEntry, EntryType } from "@/types";

// GET /api/timesheets - List user's timesheets
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get("year");

    const query: Record<string, unknown> = { userId: session.user.id };
    if (year) {
      query.year = parseInt(year);
    }

    const timesheets = await Timesheet.find(query)
      .sort({ year: -1, month: -1 })
      .lean();

    return NextResponse.json({ data: timesheets });
  } catch (error) {
    console.error("Error fetching timesheets:", error);
    return NextResponse.json(
      { error: "Failed to fetch timesheets" },
      { status: 500 }
    );
  }
}

// POST /api/timesheets - Create new timesheet for a month
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { month, year } = body;

    if (!month || !year) {
      return NextResponse.json(
        { error: "Month and year are required" },
        { status: 400 }
      );
    }

    // Check if timesheet already exists
    const existing = await Timesheet.findOne({
      userId: session.user.id,
      month,
      year,
    });

    if (existing) {
      return NextResponse.json(
        { error: "Timesheet already exists for this month" },
        { status: 409 }
      );
    }

    // Get holidays for this month
    const monthStart = startOfMonth(new Date(year, month - 1));
    const holidays = await Holiday.find({ year }).lean();

    // Generate entries for each day of the month
    const daysInMonth = getDaysInMonth(new Date(year, month - 1));
    const entries: ITimesheetEntry[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      let type: EntryType = "working";
      let remark = "";

      // Check if weekend
      if (isWeekend(date)) {
        type = "weekend";
      }

      // Check if holiday
      const holiday = holidays.find((h) => isSameDay(new Date(h.date), date));
      if (holiday) {
        type = "holiday";
        remark = holiday.name;
      }

      entries.push({
        date: day,
        type,
        task: "",
        timeIn: type === "working" ? "09:00" : "",
        timeOut: type === "working" ? "18:00" : "",
        baseHours: type === "working" ? 8 : 0,
        additionalHours: 0,
        remark,
      });
    }

    const timesheet = await Timesheet.create({
      userId: session.user.id,
      month,
      year,
      status: "draft",
      entries,
      totalBaseHours: entries.reduce((sum, e) => sum + e.baseHours, 0),
      totalAdditionalHours: 0,
    });

    return NextResponse.json({ data: timesheet }, { status: 201 });
  } catch (error) {
    console.error("Error creating timesheet:", error);
    return NextResponse.json(
      { error: "Failed to create timesheet" },
      { status: 500 }
    );
  }
}
