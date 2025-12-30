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

    if (session.user.role === "admin") {
      // Admin can see all timesheets
      const users = await User.find({}, "_id").lean();
      memberIds = users.map((u) => u._id.toString());
    } else {
      // Leader can see their teams' members (leader can lead multiple teams)
      const teams = await Team.find({ leaderId: session.user.id });
      if (teams.length > 0) {
        const allMemberIds = teams.flatMap((team) =>
          team.memberIds.map((id: { toString: () => string }) => id.toString())
        );
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

    const timesheets = await Timesheet.find(query)
      .populate("userId", "name email image")
      .sort({ submittedAt: -1 })
      .lean();

    return NextResponse.json({ data: timesheets });
  } catch (error) {
    console.error("Error fetching team timesheets:", error);
    return NextResponse.json(
      { error: "Failed to fetch team timesheets" },
      { status: 500 }
    );
  }
}
