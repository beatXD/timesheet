import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Timesheet } from "@/models";

// POST /api/timesheets/[id]/submit - Submit timesheet for approval
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

    const timesheet = await Timesheet.findById(id);

    if (!timesheet) {
      return NextResponse.json(
        { error: "Timesheet not found" },
        { status: 404 }
      );
    }

    // Only owner can submit
    if (timesheet.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Can only submit draft or rejected timesheets
    if (timesheet.status !== "draft" && timesheet.status !== "rejected") {
      return NextResponse.json(
        { error: "Can only submit draft or rejected timesheets" },
        { status: 400 }
      );
    }

    timesheet.status = "submitted";
    timesheet.submittedAt = new Date();
    timesheet.rejectedReason = undefined;

    await timesheet.save();

    return NextResponse.json({ data: timesheet });
  } catch (error) {
    console.error("Error submitting timesheet:", error);
    return NextResponse.json(
      { error: "Failed to submit timesheet" },
      { status: 500 }
    );
  }
}
