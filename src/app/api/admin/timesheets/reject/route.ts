import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Timesheet, Team, AuditLog } from "@/models";

// POST /api/admin/timesheets/reject - Admin rejects timesheets
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin can reject
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { timesheetIds, teamId, month, year, reason } = body;

    if (!reason) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      );
    }

    // Option 1: Reject specific timesheets by IDs
    if (timesheetIds && Array.isArray(timesheetIds) && timesheetIds.length > 0) {
      // Get timesheets before update for audit logging
      const timesheetsToUpdate = await Timesheet.find({
        _id: { $in: timesheetIds },
        status: "team_submitted",
      });

      const result = await Timesheet.updateMany(
        {
          _id: { $in: timesheetIds },
          status: "team_submitted",
        },
        {
          $set: {
            status: "draft",
            rejectedReason: reason,
          },
          $unset: {
            submittedAt: 1,
            approvedAt: 1,
            approvedBy: 1,
            teamSubmittedAt: 1,
            teamSubmittedBy: 1,
          },
        }
      );

      // Log audit for each timesheet
      for (const ts of timesheetsToUpdate) {
        await AuditLog.logAction({
          entityType: "timesheet",
          entityId: ts._id,
          action: "reject",
          fromStatus: "team_submitted",
          toStatus: "draft",
          performedBy: session.user.id,
          reason,
        });
      }

      return NextResponse.json({
        message: "Timesheets rejected",
        count: result.modifiedCount,
      });
    }

    // Option 2: Reject entire team for a specific month/year
    if (teamId && month && year) {
      const team = await Team.findById(teamId);
      if (!team) {
        return NextResponse.json({ error: "Team not found" }, { status: 404 });
      }

      const memberIds = team.memberIds.map((id: { toString: () => string }) =>
        id.toString()
      );

      // Get timesheets before update for audit logging
      const timesheetsToUpdate = await Timesheet.find({
        userId: { $in: memberIds },
        month,
        year,
        status: "team_submitted",
      });

      const result = await Timesheet.updateMany(
        {
          userId: { $in: memberIds },
          month,
          year,
          status: "team_submitted",
        },
        {
          $set: {
            status: "draft",
            rejectedReason: reason,
          },
          $unset: {
            submittedAt: 1,
            approvedAt: 1,
            approvedBy: 1,
            teamSubmittedAt: 1,
            teamSubmittedBy: 1,
          },
        }
      );

      // Log audit for each timesheet
      for (const ts of timesheetsToUpdate) {
        await AuditLog.logAction({
          entityType: "timesheet",
          entityId: ts._id,
          action: "reject",
          fromStatus: "team_submitted",
          toStatus: "draft",
          performedBy: session.user.id,
          reason,
          metadata: { teamId, teamName: team.name },
        });
      }

      return NextResponse.json({
        message: "Team timesheets rejected",
        count: result.modifiedCount,
      });
    }

    return NextResponse.json(
      { error: "Either timesheetIds or teamId/month/year is required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error rejecting timesheets:", error);
    return NextResponse.json(
      { error: "Failed to reject timesheets" },
      { status: 500 }
    );
  }
}
