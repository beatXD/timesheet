import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Team from "@/models/Team";
import Timesheet from "@/models/Timesheet";
import { Permissions } from "@/lib/permissions";

// GET /api/super-admin/stats - Get system statistics
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!Permissions.canAccessSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    // Get user counts by role
    const [totalUsers, adminCount, userCount] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ role: "user" }),
    ]);

    // Get team count
    const totalTeams = await Team.countDocuments();

    // Get subscription stats
    const [freeCount, teamCount, enterpriseCount] = await Promise.all([
      User.countDocuments({ "subscription.plan": "free" }),
      User.countDocuments({ "subscription.plan": "team" }),
      User.countDocuments({ "subscription.plan": "enterprise" }),
    ]);

    // Get timesheet stats
    const [totalTimesheets, approvedTimesheets, pendingTimesheets] = await Promise.all([
      Timesheet.countDocuments(),
      Timesheet.countDocuments({ status: "approved" }),
      Timesheet.countDocuments({ status: "submitted" }),
    ]);

    // Calculate mock revenue (Team = 990 THB, Enterprise = 4990 THB)
    const monthlyRevenue = teamCount * 990 + enterpriseCount * 4990;

    // Get recent signups (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSignups = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Get signup trend (last 7 days)
    const signupTrend = [];
    for (let i = 6; i >= 0; i--) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - i);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      const count = await User.countDocuments({
        createdAt: { $gte: startDate, $lt: endDate },
      });

      signupTrend.push({
        date: startDate.toISOString().split("T")[0],
        count,
      });
    }

    return NextResponse.json({
      data: {
        users: {
          total: totalUsers,
          admins: adminCount,
          users: userCount,
          recentSignups,
        },
        teams: {
          total: totalTeams,
        },
        subscriptions: {
          free: freeCount,
          team: teamCount,
          enterprise: enterpriseCount,
        },
        timesheets: {
          total: totalTimesheets,
          approved: approvedTimesheets,
          pending: pendingTimesheets,
        },
        revenue: {
          monthly: monthlyRevenue,
        },
        signupTrend,
      },
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return NextResponse.json(
      { error: "Failed to get statistics" },
      { status: 500 }
    );
  }
}
