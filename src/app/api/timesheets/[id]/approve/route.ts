import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Timesheet, Team } from "@/models";

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

    // Only admin or leader can approve
    if (session.user.role === "user") {
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

    // If leader, check if timesheet belongs to their team
    if (session.user.role === "leader") {
      const team = await Team.findOne({ leaderId: session.user.id });
      if (!team || !team.memberIds.includes(timesheet.userId)) {
        return NextResponse.json(
          { error: "Can only approve timesheets from your team" },
          { status: 403 }
        );
      }
    }

    timesheet.status = "approved";
    timesheet.approvedAt = new Date();
    timesheet.approvedBy = session.user.id as any;

    await timesheet.save();

    return NextResponse.json({ data: timesheet });
  } catch (error) {
    console.error("Error approving timesheet:", error);
    return NextResponse.json(
      { error: "Failed to approve timesheet" },
      { status: 500 }
    );
  }
}
