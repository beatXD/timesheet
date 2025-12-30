import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Timesheet, Team } from "@/models";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const currentYear = new Date().getFullYear();

    // For regular users, show their own stats
    // For leaders/admins, show team/all stats
    let userFilter: Record<string, unknown> = { userId: session.user.id };

    if (session.user.role === "admin") {
      userFilter = {}; // All timesheets
    } else if (session.user.role === "leader") {
      const team = await Team.findOne({ leaderId: session.user.id });
      if (team) {
        userFilter = { userId: { $in: [session.user.id, ...team.memberIds] } };
      }
    }

    // Get counts by status
    const [draftCount, submittedCount, approvedCount, rejectedCount] =
      await Promise.all([
        Timesheet.countDocuments({ ...userFilter, status: "draft" }),
        Timesheet.countDocuments({ ...userFilter, status: "submitted" }),
        Timesheet.countDocuments({
          ...userFilter,
          status: "approved",
          year: currentYear,
        }),
        Timesheet.countDocuments({
          ...userFilter,
          status: "rejected",
        }),
      ]);

    // Get total hours this year
    const approvedTimesheets = await Timesheet.find({
      ...userFilter,
      status: "approved",
      year: currentYear,
    }).lean();

    const totalBaseHours = approvedTimesheets.reduce(
      (sum, ts) => sum + (ts.totalBaseHours || 0),
      0
    );
    const totalAdditionalHours = approvedTimesheets.reduce(
      (sum, ts) => sum + (ts.totalAdditionalHours || 0),
      0
    );

    // Get recent timesheets
    const recentTimesheets = await Timesheet.find(userFilter)
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
