import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Timesheet, Team, User } from "@/models";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");
    const teamIdParam = searchParams.get("teamId");
    const vendorIdParam = searchParams.get("vendorId");

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const filterYear = yearParam ? parseInt(yearParam) : currentYear;

    // ===== CURRENT MONTH TIMESHEET (for all roles) =====
    const currentMonthTimesheet = await Timesheet.findOne({
      userId: session.user.id,
      year: currentYear,
      month: currentMonth,
    }).lean();

    // Calculate progress for current month timesheet
    let currentMonthProgress = 0;
    if (currentMonthTimesheet) {
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      const workDays = Math.ceil(daysInMonth * 5 / 7); // Rough estimate of work days
      const filledDays = currentMonthTimesheet.entries?.length || 0;
      currentMonthProgress = Math.min(Math.round((filledDays / workDays) * 100), 100);
    }

    // ===== TEAM SUMMARY (for leader) =====
    let teamSummary = null;
    let leaderTeams: typeof Team.prototype[] = [];

    if (session.user.role === "leader") {
      leaderTeams = await Team.find({ leaderId: session.user.id })
        .populate("memberIds", "name email")
        .lean();

      if (leaderTeams.length > 0) {
        const allMembers: { _id: string; name: string; email: string }[] = [];
        const memberIdSet = new Set<string>();

        // Include leader
        memberIdSet.add(session.user.id);
        allMembers.push({
          _id: session.user.id,
          name: session.user.name || "",
          email: session.user.email || "",
        });

        // Include team members
        leaderTeams.forEach((team) => {
          team.memberIds.forEach((member: { _id: { toString: () => string }; name: string; email: string }) => {
            const memberId = member._id.toString();
            if (!memberIdSet.has(memberId)) {
              memberIdSet.add(memberId);
              allMembers.push({
                _id: memberId,
                name: member.name,
                email: member.email,
              });
            }
          });
        });

        // Get submitted timesheets for current month
        const submittedTimesheets = await Timesheet.find({
          userId: { $in: Array.from(memberIdSet) },
          year: currentYear,
          month: currentMonth,
          status: { $in: ["submitted", "approved"] },
        }).lean();

        const submittedUserIds = new Set(
          submittedTimesheets.map((ts) => ts.userId.toString())
        );

        const notSubmitted = allMembers.filter(
          (m) => !submittedUserIds.has(m._id)
        );

        teamSummary = {
          totalMembers: allMembers.length,
          submitted: submittedUserIds.size,
          pending: notSubmitted.length,
          notSubmitted: notSubmitted.map((m) => ({ name: m.name, email: m.email })),
        };
      }
    }

    // ===== ORG OVERVIEW (for admin) =====
    let orgOverview = null;

    if (session.user.role === "admin") {
      const [allTeams, totalUsers] = await Promise.all([
        Team.find()
          .populate("leaderId", "name email")
          .populate("memberIds", "_id")
          .lean(),
        User.countDocuments(),
      ]);

      // Get all timesheets for current month
      const allCurrentMonthTimesheets = await Timesheet.find({
        year: currentYear,
        month: currentMonth,
      }).lean();

      const submittedUserIds = new Set(
        allCurrentMonthTimesheets
          .filter((ts) => ts.status === "submitted" || ts.status === "approved")
          .map((ts) => ts.userId.toString())
      );

      const pendingUserIds = new Set(
        allCurrentMonthTimesheets
          .filter((ts) => ts.status === "submitted")
          .map((ts) => ts.userId.toString())
      );

      const teamStats = allTeams.map((team) => {
        const memberIds = team.memberIds.map((m: { _id: { toString: () => string } }) =>
          m._id.toString()
        );
        const teamSubmitted = memberIds.filter((id: string) => submittedUserIds.has(id)).length;
        const teamPending = memberIds.filter((id: string) => pendingUserIds.has(id)).length;

        // leaderId is populated with User document
        const leader = team.leaderId as unknown as { name: string; email: string } | null;

        return {
          teamId: team._id.toString(),
          teamName: team.name,
          leader: leader ? {
            name: leader.name,
            email: leader.email,
          } : null,
          memberCount: memberIds.length,
          submitted: teamSubmitted,
          pending: teamPending,
        };
      });

      orgOverview = {
        totalUsers,
        totalTeams: allTeams.length,
        totalSubmitted: submittedUserIds.size,
        totalPending: pendingUserIds.size,
        teamStats,
      };
    }

    // For regular users, show their own stats
    // For leaders/admins, show team/all stats
    let userFilter: Record<string, unknown> = { userId: session.user.id };

    if (session.user.role === "admin") {
      userFilter = {}; // All timesheets
    } else if (session.user.role === "leader") {
      if (leaderTeams.length > 0) {
        const allMemberIds = leaderTeams.flatMap((t) =>
          t.memberIds.map((m: { _id: { toString: () => string } }) => m._id.toString())
        );
        userFilter = { userId: { $in: [session.user.id, ...allMemberIds] } };
      }
    }

    // Apply team filter (admin/leader only)
    if (teamIdParam && session.user.role !== "user") {
      const team = await Team.findById(teamIdParam);
      if (team) {
        const teamMemberIds = team.memberIds.map((id: { toString: () => string }) => id.toString());
        // Intersect with existing userFilter if leader
        if (session.user.role === "leader" && userFilter.userId) {
          const existingIds = (userFilter.userId as { $in: string[] }).$in || [];
          const intersection = teamMemberIds.filter((id: string) => existingIds.includes(id));
          userFilter = { userId: { $in: intersection } };
        } else {
          userFilter = { userId: { $in: teamMemberIds } };
        }
      }
    }

    // Apply vendor filter (admin/leader only)
    if (vendorIdParam && session.user.role !== "user") {
      const usersWithVendor = await User.find({ vendorId: vendorIdParam }, "_id").lean();
      const vendorUserIds = usersWithVendor.map((u) => u._id.toString());

      if (userFilter.userId) {
        const existingIds = (userFilter.userId as { $in: string[] }).$in || [];
        const intersection = vendorUserIds.filter((id) => existingIds.includes(id));
        userFilter = { userId: { $in: intersection } };
      } else {
        userFilter = { userId: { $in: vendorUserIds } };
      }
    }

    // Build date filter
    const dateFilter: Record<string, unknown> = { year: filterYear };
    if (monthParam) {
      dateFilter.month = parseInt(monthParam);
    }

    // Get counts by status
    const [draftCount, submittedCount, approvedCount, rejectedCount] =
      await Promise.all([
        Timesheet.countDocuments({ ...userFilter, ...dateFilter, status: "draft" }),
        Timesheet.countDocuments({ ...userFilter, ...dateFilter, status: "submitted" }),
        Timesheet.countDocuments({
          ...userFilter,
          ...dateFilter,
          status: "approved",
        }),
        Timesheet.countDocuments({
          ...userFilter,
          ...dateFilter,
          status: "rejected",
        }),
      ]);

    // Get total hours for the filtered period
    const approvedTimesheets = await Timesheet.find({
      ...userFilter,
      ...dateFilter,
      status: "approved",
    }).lean();

    const totalBaseHours = approvedTimesheets.reduce(
      (sum, ts) => sum + (ts.totalBaseHours || 0),
      0
    );
    const totalAdditionalHours = approvedTimesheets.reduce(
      (sum, ts) => sum + (ts.totalAdditionalHours || 0),
      0
    );

    // Calculate leave summary from all timesheets (not just approved)
    const allTimesheets = await Timesheet.find({
      ...userFilter,
      ...dateFilter,
    }).lean();

    const leaveSummary = {
      sick: 0,
      personal: 0,
      annual: 0,
      total: 0,
    };

    allTimesheets.forEach((ts) => {
      if (ts.entries) {
        ts.entries.forEach((entry: { type?: string; leaveType?: string }) => {
          if (entry.type === "leave" && entry.leaveType) {
            if (entry.leaveType === "sick") leaveSummary.sick++;
            else if (entry.leaveType === "personal") leaveSummary.personal++;
            else if (entry.leaveType === "annual") leaveSummary.annual++;
          }
        });
      }
    });
    leaveSummary.total = leaveSummary.sick + leaveSummary.personal + leaveSummary.annual;

    // Get recent timesheets (with date filter)
    const recentTimesheets = await Timesheet.find({ ...userFilter, ...dateFilter })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate("userId", "name email image")
      .lean();

    return NextResponse.json({
      data: {
        // Current month timesheet info
        currentMonth: {
          year: currentYear,
          month: currentMonth,
          timesheet: currentMonthTimesheet ? {
            id: currentMonthTimesheet._id,
            status: currentMonthTimesheet.status,
            totalHours: (currentMonthTimesheet.totalBaseHours || 0) + (currentMonthTimesheet.totalAdditionalHours || 0),
            submittedAt: currentMonthTimesheet.submittedAt,
            approvedAt: currentMonthTimesheet.approvedAt,
          } : null,
          progress: currentMonthProgress,
        },
        // Role-specific data
        teamSummary,
        orgOverview,
        // Yearly stats (filtered)
        counts: {
          draft: draftCount,
          submitted: submittedCount,
          approved: approvedCount,
          rejected: rejectedCount,
        },
        hours: {
          base: totalBaseHours,
          additional: totalAdditionalHours,
          manDays: totalBaseHours / 8,
        },
        leaveSummary,
        recentTimesheets,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard" },
      { status: 500 }
    );
  }
}
