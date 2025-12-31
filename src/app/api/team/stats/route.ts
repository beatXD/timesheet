import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Team, Timesheet, LeaveRequest } from "@/models";

// GET /api/team/stats - Get team statistics for admin overview
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin can access this endpoint
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "timesheets"; // 'timesheets' or 'leaves'
    const year = searchParams.get("year")
      ? parseInt(searchParams.get("year")!)
      : new Date().getFullYear();
    const month = searchParams.get("month")
      ? parseInt(searchParams.get("month")!)
      : new Date().getMonth() + 1;

    // Get all teams with leader and members
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teams: any[] = await Team.find()
      .populate("leaderId", "_id name email")
      .populate("memberIds", "_id name email")
      .lean();

    if (type === "timesheets") {
      // Get timesheet stats per team
      const teamStats = await Promise.all(
        teams.map(async (team) => {
          // Get all member IDs including leader
          const allMemberIds = [
            team.leaderId?._id?.toString(),
            ...team.memberIds.map((m: { _id?: { toString(): string } }) =>
              m._id?.toString()
            ),
          ].filter((id): id is string => Boolean(id));

          // Get timesheets for this team's members for the specified month/year
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const timesheets: any[] = await Timesheet.find({
            userId: { $in: allMemberIds },
            year,
            month,
          }).lean();

          // Calculate stats
          const pending = timesheets.filter(
            (ts) => ts.status === "submitted"
          ).length;
          const approved = timesheets.filter((ts) =>
            ["approved", "team_submitted", "final_approved"].includes(ts.status)
          ).length;
          const draft = timesheets.filter((ts) => ts.status === "draft").length;
          const totalBaseHours = timesheets
            .filter((ts) =>
              ["approved", "team_submitted", "final_approved"].includes(
                ts.status
              )
            )
            .reduce((sum, ts) => sum + (ts.totalBaseHours || 0), 0);

          return {
            teamId: team._id?.toString(),
            teamName: team.name,
            leaderName: (team.leaderId as { name?: string })?.name || "-",
            leaderEmail: (team.leaderId as { email?: string })?.email || "-",
            memberCount: team.memberIds.length + 1, // +1 for leader
            stats: {
              pending,
              approved,
              draft,
              totalBaseHours,
            },
          };
        })
      );

      return NextResponse.json({ data: teamStats });
    } else if (type === "leaves") {
      // Get leave request stats per team
      const teamStats = await Promise.all(
        teams.map(async (team) => {
          // Get all member IDs including leader
          const allMemberIds = [
            team.leaderId?._id?.toString(),
            ...team.memberIds.map((m: { _id?: { toString(): string } }) =>
              m._id?.toString()
            ),
          ].filter((id): id is string => Boolean(id));

          // Get leave requests for this team's members
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const leaveRequests: any[] = await LeaveRequest.find({
            userId: { $in: allMemberIds },
          }).lean();

          // Calculate stats
          const pending = leaveRequests.filter(
            (r) => r.status === "pending"
          ).length;
          const approved = leaveRequests.filter(
            (r) => r.status === "approved"
          ).length;
          const rejected = leaveRequests.filter(
            (r) => r.status === "rejected"
          ).length;

          // Calculate total pending days
          const totalPendingDays = leaveRequests
            .filter((r) => r.status === "pending")
            .reduce((sum, r) => {
              const start = new Date(r.startDate);
              const end = new Date(r.endDate);
              const days =
                Math.ceil(
                  (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
                ) + 1;
              return sum + days;
            }, 0);

          return {
            teamId: team._id?.toString(),
            teamName: team.name,
            leaderName: (team.leaderId as { name?: string })?.name || "-",
            leaderEmail: (team.leaderId as { email?: string })?.email || "-",
            memberCount: team.memberIds.length + 1, // +1 for leader
            stats: {
              pending,
              approved,
              rejected,
              totalPendingDays,
            },
          };
        })
      );

      return NextResponse.json({ data: teamStats });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Error fetching team stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch team stats" },
      { status: 500 }
    );
  }
}
