import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Timesheet, Team } from "@/models";

// GET /api/admin/timesheets - Get all timesheets grouped by team (view-only for admin)
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
    const teamId = searchParams.get("teamId");
    const status = searchParams.get("status") || "all";

    // Build query
    const query: Record<string, unknown> = {};
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);
    if (status !== "all") query.status = status;

    // Get all teams
    const teams = await Team.find(teamId ? { _id: teamId } : {})
      .populate("adminId", "name email image")
      .populate("projectId", "name");

    // For each team, get timesheets
    const result = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      teams.map(async (team: any) => {
        const memberIds = team.memberIds.map((id: { toString: () => string }) =>
          id.toString()
        );

        const timesheetQuery = {
          ...query,
          userId: { $in: memberIds },
        };

        const timesheets = await Timesheet.find(timesheetQuery)
          .populate("userId", "name email image")
          .sort({ month: -1, year: -1 });

        // Calculate totals
        const totalBaseHours = timesheets.reduce(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (sum: number, ts: any) => sum + (ts.totalBaseHours || 0),
          0
        );
        const totalAdditionalHours = timesheets.reduce(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (sum: number, ts: any) => sum + (ts.totalAdditionalHours || 0),
          0
        );

        return {
          team: {
            _id: team._id,
            name: team.name,
            leader: team.adminId,
            project: team.projectId,
            memberCount: memberIds.length,
          },
          timesheets,
          summary: {
            count: timesheets.length,
            totalBaseHours,
            totalAdditionalHours,
          },
        };
      })
    );

    // Filter out teams with no timesheets
    const filteredResult = result.filter((r: { timesheets: unknown[] }) => r.timesheets.length > 0);

    return NextResponse.json({ data: filteredResult });
  } catch (error) {
    console.error("Error fetching admin timesheets:", error);
    return NextResponse.json(
      { error: "Failed to fetch timesheets" },
      { status: 500 }
    );
  }
}
