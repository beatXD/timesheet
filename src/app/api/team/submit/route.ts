import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Timesheet, Team, AuditLog } from "@/models";

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

    // Get all team member timesheets for this month/year (including leader)
    const allMemberIds = [
      team.leaderId.toString(),
      ...team.memberIds.map((id: { toString: () => string }) => id.toString()),
    ];

    const timesheets = await Timesheet.find({
      userId: { $in: allMemberIds },
      month,
      year,
    });

    // Check if all timesheets are approved
    const approvedTimesheets = timesheets.filter(
      (ts) => ts.status === "approved"
    );
    const notApprovedCount = allMemberIds.length - approvedTimesheets.length;

    if (notApprovedCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot submit team: ${notApprovedCount} member(s) have not been approved yet`,
          approved: approvedTimesheets.length,
          total: allMemberIds.length,
        },
        { status: 400 }
      );
    }

    // Update all approved timesheets to team_submitted
    const now = new Date();
    await Timesheet.updateMany(
      {
        userId: { $in: allMemberIds },
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

    // Log audit for each timesheet
    for (const ts of approvedTimesheets) {
      await AuditLog.logAction({
        entityType: "timesheet",
        entityId: ts._id,
        action: "team_submit",
        fromStatus: "approved",
        toStatus: "team_submitted",
        performedBy: session.user.id,
        metadata: { teamId, teamName: team.name },
      });
    }

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
