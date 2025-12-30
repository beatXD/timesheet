import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Timesheet } from "@/models";

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

    // Check if user owns this timesheet or is admin/leader
    if (
      timesheet.userId.toString() !== session.user.id &&
      session.user.role === "user"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
