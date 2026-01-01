import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Timesheet, Team } from "@/models";
import { parsePaginationParams, createPaginationMeta } from "@/lib/pagination";

// GET /api/admin/timesheets/all - Get all timesheets with filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin can access
    if (session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const status = searchParams.get("status");
    const teamId = searchParams.get("teamId");

    // Build query
    const query: Record<string, unknown> = {};
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);
    if (status && status !== "all") query.status = status;

    // If teamId is specified, get only members of that team
    if (teamId) {
      const team = await Team.findById(teamId);
      if (team) {
        const memberIds = team.memberIds.map((id: { toString: () => string }) =>
          id.toString()
        );
        // Include leader as well
        if (team.adminId) {
          memberIds.push(team.adminId.toString());
        }
        query.userId = { $in: memberIds };
      }
    }

    // Parse pagination
    const { page, limit, skip } = parsePaginationParams(request);

    // Get total count for pagination
    const total = await Timesheet.countDocuments(query);

    // Fetch timesheets with user populated
    const timesheets = await Timesheet.find(query)
      .populate("userId", "name email image teamIds vendorId")
      .populate({
        path: "userId",
        populate: [
          { path: "teamIds", select: "name" },
          { path: "vendorId", select: "name" },
        ],
      })
      .sort({ year: -1, month: -1, "userId.name": 1 })
      .skip(skip)
      .limit(limit);

    // Get all teams for reference
    const teams = await Team.find({}).select("name memberIds adminId");

    // Map timesheets with team info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = timesheets.map((ts: any) => {
      // Find team for this user
      const user = ts.userId;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userTeam = teams.find((t: any) =>
        t.memberIds.some(
          (id: { toString: () => string }) => id.toString() === user._id.toString()
        ) || t.adminId?.toString() === user._id.toString()
      );

      return {
        _id: ts._id,
        userId: user,
        month: ts.month,
        year: ts.year,
        status: ts.status,
        totalBaseHours: ts.totalBaseHours,
        totalAdditionalHours: ts.totalAdditionalHours,
        submittedAt: ts.submittedAt,
        approvedAt: ts.approvedAt,
        teamSubmittedAt: ts.teamSubmittedAt,
        finalApprovedAt: ts.finalApprovedAt,
        team: userTeam ? { _id: userTeam._id, name: userTeam.name } : null,
      };
    });

    return NextResponse.json({
      data,
      pagination: createPaginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error("Error fetching all timesheets:", error);
    return NextResponse.json(
      { error: "Failed to fetch timesheets" },
      { status: 500 }
    );
  }
}
