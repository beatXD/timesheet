import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Timesheet, Team } from "@/models";

// POST /api/team/submit - Leader submits team timesheets to admin
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only leader or admin can submit team
    if (session.user.role === "user") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { teamId, month, year } = body;

    if (!teamId || !month || !year) {
      return NextResponse.json(
        { error: "teamId, month, and year are required" },
        { status: 400 }
      );
    }

    // Find the team
    const team = await Team.findById(teamId);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // If leader, verify they lead this team
    if (session.user.role === "leader") {
      if (team.leaderId.toString() !== session.user.id) {
        return NextResponse.json(
          { error: "You are not the leader of this team" },
          { status: 403 }
        );
      }
    }

    // Get all team member timesheets for this month/year
    const memberIds = team.memberIds.map((id: { toString: () => string }) =>
      id.toString()
    );

    const timesheets = await Timesheet.find({
      userId: { $in: memberIds },
      month,
      year,
    });

    // Check if all timesheets are approved
    const approvedTimesheets = timesheets.filter(
      (ts) => ts.status === "approved"
    );
    const notApprovedCount = memberIds.length - approvedTimesheets.length;

    if (notApprovedCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot submit team: ${notApprovedCount} member(s) have not been approved yet`,
          approved: approvedTimesheets.length,
          total: memberIds.length,
        },
        { status: 400 }
      );
    }

    // Update all approved timesheets to team_submitted
    const now = new Date();
    await Timesheet.updateMany(
      {
        userId: { $in: memberIds },
        month,
        year,
        status: "approved",
      },
      {
        $set: {
          status: "team_submitted",
          teamSubmittedAt: now,
          teamSubmittedBy: session.user.id,
        },
      }
    );

    return NextResponse.json({
      message: "Team timesheets submitted to admin",
      count: approvedTimesheets.length,
    });
  } catch (error) {
    console.error("Error submitting team:", error);
    return NextResponse.json(
      { error: "Failed to submit team timesheets" },
      { status: 500 }
    );
  }
}
