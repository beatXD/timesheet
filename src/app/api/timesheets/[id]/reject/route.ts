import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Timesheet, Team } from "@/models";

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

    // Only admin or leader can reject
    if (session.user.role === "user") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;

    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      );
    }

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

    // If leader, check if timesheet belongs to their team(s)
    if (session.user.role === "leader") {
      const teams = await Team.find({ leaderId: session.user.id });
      const allMemberIds = teams.flatMap((t) =>
        t.memberIds.map((id: { toString: () => string }) => id.toString())
      );
      if (!allMemberIds.includes(timesheet.userId.toString())) {
        return NextResponse.json(
          { error: "Can only reject timesheets from your team" },
          { status: 403 }
        );
      }
    }

    timesheet.status = "rejected";
    timesheet.rejectedReason = reason;

    await timesheet.save();

    return NextResponse.json({ data: timesheet });
  } catch (error) {
    console.error("Error rejecting timesheet:", error);
    return NextResponse.json(
      { error: "Failed to reject timesheet" },
      { status: 500 }
    );
  }
}
