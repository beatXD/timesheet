import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { LeaveRequest, Team, User } from "@/models";
import { sendLeaveRequestEmail } from "@/lib/email";

// GET /api/leave-requests - List leave requests
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const scope = searchParams.get("scope") || "own"; // "own" or "team"

    // Build query filter
    const filter: Record<string, unknown> = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    // Role-based filtering
    if (session.user.role === "user" || scope === "own") {
      // Regular users can only see their own requests
      filter.userId = session.user.id;
    } else if (session.user.role === "leader" && scope === "team") {
      // Leaders can see their team members' requests
      const teams = await Team.find({ leaderId: session.user.id });
      if (teams.length > 0) {
        const allMemberIds = teams.flatMap((t) =>
          t.memberIds.map((id: { toString: () => string }) => id.toString())
        );
        filter.userId = { $in: allMemberIds };
      } else {
        // If not leading any team, return empty
        return NextResponse.json({ data: [] });
      }
    }
    // Admin with scope "team" can see all

    const leaveRequests = await LeaveRequest.find(filter)
      .populate("userId", "name email image")
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    // Convert ObjectIds to strings
    const data = leaveRequests.map((lr) => ({
      ...lr,
      _id: lr._id.toString(),
      userId: lr.userId,
      reviewedBy: lr.reviewedBy || null,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error fetching leave requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch leave requests" },
      { status: 500 }
    );
  }
}

// POST /api/leave-requests - Create a new leave request
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { startDate, endDate, leaveType, reason } = body;

    // Validate required fields
    if (!startDate || !endDate || !leaveType) {
      return NextResponse.json(
        { error: "Start date, end date, and leave type are required" },
        { status: 400 }
      );
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return NextResponse.json(
        { error: "Start date must be before end date" },
        { status: 400 }
      );
    }

    // Create leave request
    const leaveRequest = await LeaveRequest.create({
      userId: session.user.id,
      startDate: start,
      endDate: end,
      leaveType,
      reason,
      status: "pending",
    });

    // Find the user's team leader(s) to send notification
    const teams = await Team.find({ memberIds: session.user.id }).populate(
      "leaderId",
      "name email"
    );

    // Get current user info for email
    const currentUser = await User.findById(session.user.id).lean();

    // Send email to each team leader
    for (const team of teams) {
      const leader = team.leaderId as unknown as {
        _id: string;
        name: string;
        email: string;
      };
      if (leader?.email) {
        try {
          await sendLeaveRequestEmail({
            to: leader.email,
            leaderName: leader.name,
            userName: currentUser?.name || session.user.name,
            startDate: start,
            endDate: end,
            leaveType,
            reason,
          });
        } catch (emailError) {
          console.error("Failed to send email to leader:", emailError);
          // Don't fail the request if email fails
        }
      }
    }

    return NextResponse.json({ data: leaveRequest }, { status: 201 });
  } catch (error) {
    console.error("Error creating leave request:", error);
    return NextResponse.json(
      { error: "Failed to create leave request" },
      { status: 500 }
    );
  }
}
