import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { PersonalTimesheet } from "@/models";

// GET /api/personal-timesheets/[id] - Get single personal timesheet
export async function GET(
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

    const timesheet = await PersonalTimesheet.findById(id).lean();

    if (!timesheet) {
      return NextResponse.json(
        { error: "Personal timesheet not found" },
        { status: 404 }
      );
    }

    // Only owner can view their personal timesheets
    if (timesheet.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ data: timesheet });
  } catch (error) {
    console.error("Error fetching personal timesheet:", error);
    return NextResponse.json(
      { error: "Failed to fetch personal timesheet" },
      { status: 500 }
    );
  }
}

// PUT /api/personal-timesheets/[id] - Update personal timesheet
export async function PUT(
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

    // Only owner can update
    if (timesheet.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { entries } = body;

    if (entries) {
      // Validate entries
      const daysInMonth = new Date(timesheet.year, timesheet.month, 0).getDate();

      for (const entry of entries) {
        // Validate date is within the month
        if (entry.date < 1 || entry.date > daysInMonth) {
          return NextResponse.json(
            { error: `Invalid date: ${entry.date}. Must be between 1 and ${daysInMonth}` },
            { status: 400 }
          );
        }

        // Validate timeOut > timeIn if both exist
        if (entry.timeIn && entry.timeOut) {
          const [inH, inM] = entry.timeIn.split(":").map(Number);
          const [outH, outM] = entry.timeOut.split(":").map(Number);
          const timeInMinutes = inH * 60 + inM;
          const timeOutMinutes = outH * 60 + outM;

          if (timeOutMinutes <= timeInMinutes) {
            return NextResponse.json(
              { error: `Invalid time for date ${entry.date}: timeOut must be after timeIn` },
              { status: 400 }
            );
          }
        }

        // Validate baseHours >= 0
        if (entry.baseHours !== undefined && entry.baseHours < 0) {
          return NextResponse.json(
            { error: `Invalid baseHours for date ${entry.date}: must be >= 0` },
            { status: 400 }
          );
        }

        // Validate additionalHours >= 0
        if (entry.additionalHours !== undefined && entry.additionalHours < 0) {
          return NextResponse.json(
            { error: `Invalid additionalHours for date ${entry.date}: must be >= 0` },
            { status: 400 }
          );
        }
      }

      timesheet.entries = entries;
      timesheet.totalBaseHours = entries.reduce(
        (sum: number, e: { baseHours: number }) => sum + (e.baseHours || 0),
        0
      );
      timesheet.totalAdditionalHours = entries.reduce(
        (sum: number, e: { additionalHours: number }) =>
          sum + (e.additionalHours || 0),
        0
      );
    }

    await timesheet.save();

    return NextResponse.json({ data: timesheet });
  } catch (error) {
    console.error("Error updating personal timesheet:", error);
    return NextResponse.json(
      { error: "Failed to update personal timesheet" },
      { status: 500 }
    );
  }
}

// DELETE /api/personal-timesheets/[id] - Delete personal timesheet
export async function DELETE(
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

    // Only owner can delete
    if (timesheet.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await timesheet.deleteOne();

    return NextResponse.json({ message: "Personal timesheet deleted" });
  } catch (error) {
    console.error("Error deleting personal timesheet:", error);
    return NextResponse.json(
      { error: "Failed to delete personal timesheet" },
      { status: 500 }
    );
  }
}
