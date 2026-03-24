import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ActivityLog, Team } from "@/models";

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

    // Get team member IDs for permission scoping
    let memberIds: string[] = [];

    if (session.user.role === "super_admin") {
      // super_admin sees all activity
    } else {
      const teams = await Team.find({ adminId: session.user.id }).lean();
      const allMemberIds = teams.flatMap((t) =>
        t.memberIds.map((id: { toString: () => string }) => id.toString())
      );
      allMemberIds.push(session.user.id);
      memberIds = [...new Set(allMemberIds)];
    }

    const query: Record<string, unknown> = {};

    if (session.user.role !== "super_admin") {
      query.userId = { $in: memberIds };
    }
    if (action) {
      query.action = action;
    }
    if (memberId) {
      query.userId = memberId;
    }
    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) dateFilter.$gte = new Date(from);
      if (to) dateFilter.$lte = new Date(to);
      query.createdAt = dateFilter;
    }

    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      ActivityLog.find(query)
        .populate("userId", "name email image")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments(query),
    ]);

    return NextResponse.json({
      data: activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching team activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch team activity" },
      { status: 500 }
    );
  }
}
