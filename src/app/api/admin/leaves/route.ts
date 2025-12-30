import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Timesheet, Team, User } from "@/models";
import { createPaginationMeta } from "@/lib/pagination";

interface LeaveRecord {
  date: Date;
  leaveType: string;
  user: {
    _id: string;
    name: string;
    email: string;
    image?: string;
  };
  timesheetId: string;
  month: number;
  year: number;
  remark?: string;
}

// GET /api/admin/leaves - List leave records
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");
    const userIdParam = searchParams.get("userId");
    const leaveTypeParam = searchParams.get("leaveType");

    const filterYear = yearParam ? parseInt(yearParam) : new Date().getFullYear();

    // Role-based access control
    let userFilter: Record<string, unknown> = {};

    if (session.user.role === "user") {
      // Regular users can only see their own leaves
      userFilter = { userId: session.user.id };
    } else if (session.user.role === "leader") {
      // Leaders can see team members' leaves
      const teams = await Team.find({ leaderId: session.user.id });
      if (teams.length > 0) {
        const allMemberIds = teams.flatMap((t) =>
          t.memberIds.map((id: { toString: () => string }) => id.toString())
        );
        userFilter = { userId: { $in: [session.user.id, ...allMemberIds] } };
      } else {
        userFilter = { userId: session.user.id };
      }
    }
    // Admin has no filter (can see all)

    // Apply user filter from query (admin/leader only)
    if (userIdParam && session.user.role !== "user") {
      // Verify user is within the allowed scope
      if (session.user.role === "leader" && userFilter.userId) {
        const allowedIds = (userFilter.userId as { $in: string[] }).$in || [];
        if (!allowedIds.includes(userIdParam)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
      userFilter = { userId: userIdParam };
    }

    // Build date filter
    const dateFilter: Record<string, unknown> = { year: filterYear };
    if (monthParam) {
      dateFilter.month = parseInt(monthParam);
    }

    // Get timesheets with leave entries
    const timesheets = await Timesheet.find({
      ...userFilter,
      ...dateFilter,
    })
      .populate("userId", "name email image")
      .lean();

    // Extract leave records
    const leaveRecords: LeaveRecord[] = [];

    timesheets.forEach((ts) => {
      if (ts.entries) {
        ts.entries.forEach((entry: {
          type?: string;
          leaveType?: string;
          date?: number;
          remark?: string;
        }) => {
          if (entry.type === "leave" && entry.leaveType) {
            // Apply leave type filter if specified
            if (leaveTypeParam && entry.leaveType !== leaveTypeParam) {
              return;
            }

            const user = ts.userId as unknown as {
              _id: { toString: () => string };
              name: string;
              email: string;
              image?: string;
            };

            leaveRecords.push({
              date: new Date(ts.year, ts.month - 1, entry.date || 1),
              leaveType: entry.leaveType,
              user: {
                _id: user._id.toString(),
                name: user.name,
                email: user.email,
                image: user.image,
              },
              timesheetId: ts._id.toString(),
              month: ts.month,
              year: ts.year,
              remark: entry.remark,
            });
          }
        });
      }
    });

    // Sort by date descending
    leaveRecords.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Calculate summary (before pagination)
    const summary = {
      sick: leaveRecords.filter((r) => r.leaveType === "sick").length,
      personal: leaveRecords.filter((r) => r.leaveType === "personal").length,
      annual: leaveRecords.filter((r) => r.leaveType === "annual").length,
      total: leaveRecords.length,
    };

    // Apply pagination to records
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    const page = pageParam ? Math.max(1, parseInt(pageParam)) : 1;
    const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam))) : 20;
    const skip = (page - 1) * limit;
    const total = leaveRecords.length;
    const paginatedRecords = leaveRecords.slice(skip, skip + limit);

    // Get list of users for filter dropdown (admin/leader only)
    let users: { _id: string; name: string; email: string }[] = [];
    if (session.user.role !== "user") {
      let rawUsers;
      if (session.user.role === "admin") {
        rawUsers = await User.find({}, "name email").lean();
      } else if (session.user.role === "leader") {
        const teams = await Team.find({ leaderId: session.user.id });
        const allMemberIds = teams.flatMap((t) =>
          t.memberIds.map((id: { toString: () => string }) => id.toString())
        );
        rawUsers = await User.find(
          { _id: { $in: [session.user.id, ...allMemberIds] } },
          "name email"
        ).lean();
      }
      if (rawUsers) {
        users = rawUsers.map((u) => ({
          _id: u._id.toString(),
          name: u.name,
          email: u.email,
        }));
      }
    }

    return NextResponse.json({
      data: {
        records: paginatedRecords,
        summary,
        users,
      },
      pagination: createPaginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error("Error fetching leaves:", error);
    return NextResponse.json(
      { error: "Failed to fetch leave records" },
      { status: 500 }
    );
  }
}
