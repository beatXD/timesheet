import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Timesheet, User, Team, LeaveRequest, LeaveBalance } from "@/models";

// GET /api/reports/summary - Get comprehensive summary report
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
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : undefined;
    const teamId = searchParams.get("teamId");

    // Build base query for user filtering
    let userIds: string[] | undefined;

    if (session.user.role === "leader") {
      // Leaders can only see their team data
      const teams = await Team.find({ leaderId: session.user.id });
      userIds = teams.flatMap((t: { leaderId: { toString: () => string }; memberIds: { toString: () => string }[] }) =>
        [
          t.leaderId.toString(),
          ...t.memberIds.map((id) => id.toString())
        ]
      );
    } else if (teamId) {
      // Admin filtering by specific team
      const team = await Team.findById(teamId);
      if (team) {
        userIds = [
          team.leaderId.toString(),
          ...team.memberIds.map((id: { toString: () => string }) => id.toString())
        ];
      }
    }

    // Timesheet query
    const timesheetQuery: Record<string, unknown> = { year };
    if (month) timesheetQuery.month = month;
    if (userIds) timesheetQuery.userId = { $in: userIds };

    // Leave request query
    const leaveQuery: Record<string, unknown> = {};
    if (userIds) leaveQuery.userId = { $in: userIds };
    // Filter by year from createdAt
    leaveQuery.createdAt = {
      $gte: new Date(year, 0, 1),
      $lt: new Date(year + 1, 0, 1),
    };

    // Get timesheet data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const timesheets: any[] = await Timesheet.find(timesheetQuery);

    // Aggregate timesheet stats
    const timesheetStats = {
      total: timesheets.length,
      byStatus: {
        draft: timesheets.filter(t => t.status === "draft").length,
        submitted: timesheets.filter(t => t.status === "submitted").length,
        approved: timesheets.filter(t => t.status === "approved").length,
        rejected: timesheets.filter(t => t.status === "rejected").length,
      },
      totalBaseHours: timesheets.reduce((sum, t) => sum + (t.totalBaseHours || 0), 0),
      totalAdditionalHours: timesheets.reduce((sum, t) => sum + (t.totalAdditionalHours || 0), 0),
    };

    // Get leave request data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const leaveRequests: any[] = await LeaveRequest.find(leaveQuery);

    const leaveStats = {
      total: leaveRequests.length,
      byStatus: {
        pending: leaveRequests.filter(l => l.status === "pending").length,
        approved: leaveRequests.filter(l => l.status === "approved").length,
        rejected: leaveRequests.filter(l => l.status === "rejected").length,
      },
      byType: {
        sick: leaveRequests.filter(l => l.leaveType === "sick").length,
        personal: leaveRequests.filter(l => l.leaveType === "personal").length,
        annual: leaveRequests.filter(l => l.leaveType === "annual").length,
      },
      totalDaysRequested: leaveRequests.reduce((sum, l) => sum + (l.daysRequested || 0), 0),
      totalDaysApproved: leaveRequests.reduce((sum, l) => sum + (l.daysApproved || 0), 0),
    };

    // Get user count
    const userQuery = userIds ? { _id: { $in: userIds } } : {};
    const userCount = await User.countDocuments(userQuery);

    // Get team count (admin only)
    let teamCount = 0;
    if (session.user.role === "admin") {
      teamCount = await Team.countDocuments();
    } else {
      teamCount = (await Team.find({ leaderId: session.user.id })).length;
    }

    // Monthly breakdown (if full year requested)
    let monthlyBreakdown: Array<{
      month: number;
      timesheets: number;
      baseHours: number;
      additionalHours: number;
      leaves: number;
    }> = [];

    if (!month) {
      for (let m = 1; m <= 12; m++) {
        const monthTimesheets = timesheets.filter(t => t.month === m);
        const monthLeaves = leaveRequests.filter(l => {
          const leaveDate = new Date(l.createdAt);
          return leaveDate.getMonth() + 1 === m;
        });

        monthlyBreakdown.push({
          month: m,
          timesheets: monthTimesheets.length,
          baseHours: monthTimesheets.reduce((sum, t) => sum + (t.totalBaseHours || 0), 0),
          additionalHours: monthTimesheets.reduce((sum, t) => sum + (t.totalAdditionalHours || 0), 0),
          leaves: monthLeaves.length,
        });
      }
    }

    return NextResponse.json({
      data: {
        period: {
          year,
          month: month || "all",
        },
        overview: {
          users: userCount,
          teams: teamCount,
        },
        timesheets: timesheetStats,
        leaves: leaveStats,
        monthlyBreakdown: monthlyBreakdown.length > 0 ? monthlyBreakdown : undefined,
      },
    });
  } catch (error) {
    console.error("Error generating summary report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
