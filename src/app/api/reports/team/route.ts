import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Timesheet, Team, User, LeaveBalance, LeaveSettings } from "@/models";

// GET /api/reports/team - Get team-based report
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin and leader can access reports
    if (session.user.role === "user") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));

    // Get teams based on role
    let teams;
    if (session.user.role === "admin") {
      teams = await Team.find()
        .populate("leaderId", "name email image")
        .populate("projectId", "name");
    } else {
      teams = await Team.find({ leaderId: session.user.id })
        .populate("leaderId", "name email image")
        .populate("projectId", "name");
    }

    // Get settings for leave balance
    const settings = await LeaveSettings.getSettings();

    // Build team reports
    const teamReports = await Promise.all(
      teams.map(async (team) => {
        // Get all member IDs including leader
        const memberIds = [
          team.leaderId._id.toString(),
          ...team.memberIds.map((id: { toString: () => string }) => id.toString())
        ];

        // Get timesheets for this month
        const timesheets = await Timesheet.find({
          userId: { $in: memberIds },
          year,
          month,
        }).populate("userId", "name email image");

        // Get members info
        const members = await User.find({ _id: { $in: memberIds } })
          .select("name email image role");

        // Get leave balances for the year
        const leaveBalances = await LeaveBalance.find({
          userId: { $in: memberIds },
          year,
        });

        // Calculate timesheet completion
        const timesheetCompletion = {
          total: memberIds.length,
          submitted: 0,
          approved: 0,
          pending: 0,
          missing: 0,
        };

        members.forEach(member => {
          const ts = timesheets.find(t => t.userId._id.toString() === member._id.toString());
          if (!ts) {
            timesheetCompletion.missing++;
          } else if (ts.status === "draft") {
            timesheetCompletion.pending++;
          } else if (["submitted", "approved", "team_submitted", "final_approved"].includes(ts.status)) {
            if (ts.status === "submitted") {
              timesheetCompletion.submitted++;
            } else {
              timesheetCompletion.approved++;
            }
          } else {
            timesheetCompletion.pending++;
          }
        });

        // Aggregate hours
        const totalBaseHours = timesheets.reduce((sum, t) => sum + (t.totalBaseHours || 0), 0);
        const totalAdditionalHours = timesheets.reduce((sum, t) => sum + (t.totalAdditionalHours || 0), 0);

        // Aggregate leave balance
        const leaveUsage = {
          sick: { total: 0, used: 0 },
          personal: { total: 0, used: 0 },
          annual: { total: 0, used: 0 },
        };

        leaveBalances.forEach(balance => {
          leaveUsage.sick.total += balance.quotas.sick.total;
          leaveUsage.sick.used += balance.quotas.sick.used;
          leaveUsage.personal.total += balance.quotas.personal.total;
          leaveUsage.personal.used += balance.quotas.personal.used;
          leaveUsage.annual.total += balance.quotas.annual.total;
          leaveUsage.annual.used += balance.quotas.annual.used;
        });

        return {
          team: {
            _id: team._id,
            name: team.name,
            leader: team.leaderId,
            project: team.projectId,
            memberCount: memberIds.length,
          },
          timesheetCompletion,
          hours: {
            totalBase: totalBaseHours,
            totalAdditional: totalAdditionalHours,
            averagePerMember: memberIds.length > 0 ? Math.round(totalBaseHours / memberIds.length) : 0,
          },
          leaveUsage,
        };
      })
    );

    return NextResponse.json({
      data: {
        period: { year, month },
        teams: teamReports,
      },
    });
  } catch (error) {
    console.error("Error generating team report:", error);
    return NextResponse.json(
      { error: "Failed to generate team report" },
      { status: 500 }
    );
  }
}
