import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Timesheet, Team, User } from "@/models";

// GET /api/team/timesheets - Get team members' timesheets (for leader/admin)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin or leader can access
    if (session.user.role === "user") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    let memberIds: string[] = [];
    let teamsData: Array<{
      _id: string;
      name: string;
      adminId: string;
      memberIds: string[];
    }> = [];

    if (session.user.role === "super_admin") {
      // Admin can see all timesheets
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const users: any[] = await User.find({}, "_id").lean();
      memberIds = users.map((u) => u._id.toString());
      // Get all teams for mapping
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const teams: any[] = await Team.find().lean();
      teamsData = teams.map((t) => ({
        _id: t._id.toString(),
        name: t.name,
        adminId: t.adminId?.toString() || "",
        memberIds: t.memberIds.map((id: { toString: () => string }) =>
          id.toString()
        ),
      }));
    } else {
      // Leader can see their teams' members + their own timesheet
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const teams: any[] = await Team.find({ adminId: session.user.id });
      if (teams.length > 0) {
        teamsData = teams.map((t) => ({
          _id: t._id.toString(),
          name: t.name,
          adminId: t.adminId?.toString() || "",
          memberIds: t.memberIds.map((id: { toString: () => string }) =>
            id.toString()
          ),
        }));
        const allMemberIds = teams.flatMap((team) =>
          team.memberIds.map((id: { toString: () => string }) => id.toString())
        );
        // Include leader's own ID for self-approval
        allMemberIds.push(session.user.id);
        // Remove duplicates (if same user is in multiple teams)
        memberIds = [...new Set(allMemberIds)];
      }
    }

    const query: Record<string, unknown> = {
      userId: { $in: memberIds },
    };

    if (status) {
      query.status = status;
    }
    if (month) {
      query.month = parseInt(month);
    }
    if (year) {
      query.year = parseInt(year);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const timesheets: any[] = await Timesheet.find(query)
      .populate("userId", "name email image")
      .sort({ submittedAt: -1 })
      .lean();

    // Add team info to each timesheet
    const timesheetsWithTeam = timesheets.map((ts) => {
      const userId = (ts.userId as { _id?: { toString(): string } })?._id?.toString() || "";
      const team = teamsData.find(
        (t) => t.adminId === userId || t.memberIds.includes(userId)
      );
      return {
        ...ts,
        teamId: team?._id || null,
        teamName: team?.name || null,
      };
    });

    return NextResponse.json({ data: timesheetsWithTeam });
  } catch (error) {
    console.error("Error fetching team timesheets:", error);
    return NextResponse.json(
      { error: "Failed to fetch team timesheets" },
      { status: 500 }
    );
  }
}
