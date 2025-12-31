import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Timesheet, Team } from "@/models";

// GET /api/timesheets/[id] - Get single timesheet
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

    const timesheet = await Timesheet.findById(id).lean();

    if (!timesheet) {
      return NextResponse.json(
        { error: "Timesheet not found" },
        { status: 404 }
      );
    }

    // Check if user owns this timesheet
    if (timesheet.userId.toString() !== session.user.id) {
      // Regular users can only view their own timesheets
      if (session.user.role === "user") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      // Leaders can only view their team members' timesheets
      if (session.user.role === "leader") {
        const teams = await Team.find({ leaderId: session.user.id });
        const allMemberIds = teams.flatMap((t: { memberIds: { toString: () => string }[] }) =>
          t.memberIds.map((id) => id.toString())
        );
        if (!allMemberIds.includes(timesheet.userId.toString())) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
      // Admins can view all timesheets
    }

    return NextResponse.json({ data: timesheet });
  } catch (error) {
    console.error("Error fetching timesheet:", error);
    return NextResponse.json(
      { error: "Failed to fetch timesheet" },
      { status: 500 }
    );
  }
}

// PUT /api/timesheets/[id] - Update timesheet
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

    const timesheet = await Timesheet.findById(id);

    if (!timesheet) {
      return NextResponse.json(
        { error: "Timesheet not found" },
        { status: 404 }
      );
    }

    // Only owner can update
    if (timesheet.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Can't update submitted/approved timesheets
    if (timesheet.status !== "draft" && timesheet.status !== "rejected") {
      return NextResponse.json(
        { error: "Cannot update timesheet in current status" },
        { status: 400 }
      );
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

        // Validate leaveType is required when type is "leave"
        if (entry.type === "leave" && !entry.leaveType) {
          return NextResponse.json(
            { error: `Leave type is required for date ${entry.date}` },
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

    // If was rejected, reset to draft
    if (timesheet.status === "rejected") {
      timesheet.status = "draft";
      timesheet.rejectedReason = undefined;
    }

    await timesheet.save();

    return NextResponse.json({ data: timesheet });
  } catch (error) {
    console.error("Error updating timesheet:", error);
    return NextResponse.json(
      { error: "Failed to update timesheet" },
      { status: 500 }
    );
  }
}

// DELETE /api/timesheets/[id] - Delete timesheet
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

    const timesheet = await Timesheet.findById(id);

    if (!timesheet) {
      return NextResponse.json(
        { error: "Timesheet not found" },
        { status: 404 }
      );
    }

    // Only owner or admin can delete
    if (
      timesheet.userId.toString() !== session.user.id &&
      session.user.role !== "admin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Can only delete draft timesheets
    if (timesheet.status !== "draft") {
      return NextResponse.json(
        { error: "Can only delete draft timesheets" },
        { status: 400 }
      );
    }

    await timesheet.deleteOne();

    return NextResponse.json({ message: "Timesheet deleted" });
  } catch (error) {
    console.error("Error deleting timesheet:", error);
    return NextResponse.json(
      { error: "Failed to delete timesheet" },
      { status: 500 }
    );
  }
}
