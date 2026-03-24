import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ActivityLog, Team } from "@/models";

// GET /api/team/activity - Get team activity logs (for leader/admin)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "user") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");
    const memberId = searchParams.get("memberId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Get teams led by this user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teams: any[] = await Team.find({ adminId: session.user.id }).lean();
    const teamIds = teams.map((t) => t._id);

    if (teamIds.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      });
    }

    // Build query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {
      teamId: { $in: teamIds },
    };

    if (action) {
      query.action = action;
    }

    if (memberId) {
      query.userId = memberId;
    }

    if (from || to) {
      query.createdAt = {};
      if (from) {
        query.createdAt.$gte = new Date(from);
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = toDate;
      }
    }

    const total = await ActivityLog.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const activities = await ActivityLog.find(query)
      .populate("userId", "name email image")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      data: activities,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    console.error("Failed to fetch team activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}
