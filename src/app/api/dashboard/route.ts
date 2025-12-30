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

    const filterYear = yearParam ? parseInt(yearParam) : new Date().getFullYear();

    // For regular users, show their own stats
    // For leaders/admins, show team/all stats
    let userFilter: Record<string, unknown> = { userId: session.user.id };

    if (session.user.role === "admin") {
      userFilter = {}; // All timesheets
    } else if (session.user.role === "leader") {
      const teams = await Team.find({ leaderId: session.user.id });
      if (teams.length > 0) {
        const allMemberIds = teams.flatMap((t) =>
          t.memberIds.map((id: { toString: () => string }) => id.toString())
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

    // Get recent timesheets (with date filter)
    const recentTimesheets = await Timesheet.find({ ...userFilter, ...dateFilter })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate("userId", "name email image")
      .lean();

    return NextResponse.json({
      data: {
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
