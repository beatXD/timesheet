import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Timesheet, Team, User } from "@/models";

// Type guard for populated user
interface PopulatedUser {
  _id: { toString: () => string };
  name: string;
  email: string;
}

interface PopulatedLeader {
  name: string;
  email: string;
}

function isPopulatedUser(obj: unknown): obj is PopulatedUser {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "_id" in obj &&
    "name" in obj &&
    "email" in obj
  );
}

function isPopulatedLeader(obj: unknown): obj is PopulatedLeader {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "name" in obj &&
    "email" in obj
  );
}

// All statuses that count as "submitted" for team summary
const SUBMITTED_STATUSES = ["submitted", "approved", "team_submitted", "final_approved"];
// Statuses that are pending approval
const PENDING_STATUSES = ["submitted", "team_submitted"];

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
    // FIX #5: Count actual working entries instead of rough estimate
    let currentMonthProgress = 0;
    if (currentMonthTimesheet) {
      const entries = currentMonthTimesheet.entries || [];
      // Count entries that have actual work (type is 'work' or has hours filled)
      const workingEntries = entries.filter((entry: { type?: string; baseHours?: number }) =>
        entry.type === "work" || (entry.baseHours && entry.baseHours > 0)
      ).length;

      // Calculate working days in the month (excluding weekends)
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      let workDays = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth - 1, day);
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          workDays++;
        }
      }

      // FIX #7: Prevent division by zero
      currentMonthProgress = workDays > 0
        ? Math.min(Math.round((workingEntries / workDays) * 100), 100)
        : 0;
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
          team.memberIds.forEach((member: unknown) => {
            // FIX #8: Use type guard instead of unsafe cast
            if (isPopulatedUser(member)) {
              const memberId = member._id.toString();
              if (!memberIdSet.has(memberId)) {
                memberIdSet.add(memberId);
                allMembers.push({
                  _id: memberId,
                  name: member.name,
                  email: member.email,
                });
              }
            }
          });
        });

        // FIX #2: Include all submitted statuses
        const submittedTimesheets = await Timesheet.find({
          userId: { $in: Array.from(memberIdSet) },
          year: currentYear,
          month: currentMonth,
          status: { $in: SUBMITTED_STATUSES },
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

      // FIX #4: Fetch timesheets once and filter in JavaScript
      const allCurrentMonthTimesheets = await Timesheet.find({
        year: currentYear,
        month: currentMonth,
      }).lean();

      // FIX #2: Include all submitted statuses
      const submittedUserIds = new Set(
        allCurrentMonthTimesheets
          .filter((ts) => SUBMITTED_STATUSES.includes(ts.status))
          .map((ts) => ts.userId.toString())
      );

      // FIX #3: Include team_submitted in pending count
      const pendingUserIds = new Set(
        allCurrentMonthTimesheets
          .filter((ts) => PENDING_STATUSES.includes(ts.status))
          .map((ts) => ts.userId.toString())
      );

      const teamStats = allTeams.map((team) => {
        const memberIds: string[] = [];
        team.memberIds.forEach((m: unknown) => {
          // FIX #8: Use type guard
          if (typeof m === "object" && m !== null && "_id" in m) {
            const obj = m as { _id: { toString: () => string } };
            memberIds.push(obj._id.toString());
          }
        });

        const teamSubmitted = memberIds.filter((id: string) => submittedUserIds.has(id)).length;
        const teamPending = memberIds.filter((id: string) => pendingUserIds.has(id)).length;

        // FIX #8: Use type guard for leader
        const leader = isPopulatedLeader(team.leaderId) ? team.leaderId : null;

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
        const allMemberIds: string[] = [];
        leaderTeams.forEach((t) => {
          t.memberIds.forEach((m: unknown) => {
            // FIX #8: Use type guard
            if (typeof m === "object" && m !== null && "_id" in m) {
              const obj = m as { _id: { toString: () => string } };
              allMemberIds.push(obj._id.toString());
            }
          });
        });
        userFilter = { userId: { $in: [session.user.id, ...allMemberIds] } };
      }
    }

    // Apply team filter (admin/leader only)
    if (teamIdParam && session.user.role !== "user") {
      const team = await Team.findById(teamIdParam);
      if (team) {
        // FIX #1: Security check - Leader can only view their own teams
        if (session.user.role === "leader") {
          const isLeaderOfTeam = team.leaderId.toString() === session.user.id;
          if (!isLeaderOfTeam) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
          }
        }

        const teamMemberIds: string[] = [];
        team.memberIds.forEach((id: unknown) => {
          if (typeof id === "object" && id !== null && "toString" in id) {
            teamMemberIds.push((id as { toString: () => string }).toString());
          }
        });

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

    // FIX #4: Fetch all timesheets once and calculate stats in JavaScript
    const allTimesheets = await Timesheet.find({
      ...userFilter,
      ...dateFilter,
    }).lean();

    // Calculate counts from fetched data
    const draftCount = allTimesheets.filter(ts => ts.status === "draft").length;
    const submittedCount = allTimesheets.filter(ts => ts.status === "submitted").length;
    const approvedCount = allTimesheets.filter(ts => ts.status === "approved").length;
    const rejectedCount = allTimesheets.filter(ts => ts.status === "rejected").length;

    // Get approved timesheets for hours calculation
    // FIX #6: Also include final_approved for accurate hour totals
    const approvedTimesheets = allTimesheets.filter(
      ts => ts.status === "approved" || ts.status === "final_approved"
    );

    const totalBaseHours = approvedTimesheets.reduce(
      (sum, ts) => sum + (ts.totalBaseHours || 0),
      0
    );
    const totalAdditionalHours = approvedTimesheets.reduce(
      (sum, ts) => sum + (ts.totalAdditionalHours || 0),
      0
    );

    // FIX #6: Calculate leave summary from approved timesheets only
    const leaveSummary = {
      sick: 0,
      personal: 0,
      annual: 0,
      total: 0,
    };

    approvedTimesheets.forEach((ts) => {
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

    // Get recent timesheets (sort in memory since we already have the data)
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
