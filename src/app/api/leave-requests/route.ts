import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { LeaveRequest, Team, User, LeaveBalance, LeaveSettings } from "@/models";
import { parsePaginationParams, createPaginationMeta } from "@/lib/pagination";
import { sendLeaveRequestEmail } from "@/lib/email";
import { createLeaveRequestSchema, validateRequest } from "@/lib/validation/schemas";

// Helper function to calculate working days between two dates
function calculateWorkingDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

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
    // Default scope: admin sees all, others see own
    const defaultScope = session.user.role === "admin" ? "all" : "own";
    const scope = searchParams.get("scope") || defaultScope;

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

    // Parse pagination params
    const { page, limit, skip } = parsePaginationParams(request);

    // Get total count
    const total = await LeaveRequest.countDocuments(filter);

    const leaveRequests = await LeaveRequest.find(filter)
      .populate("userId", "name email image")
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Convert ObjectIds to strings
    const data = leaveRequests.map((lr) => ({
      ...lr,
      _id: lr._id.toString(),
      userId: lr.userId,
      reviewedBy: lr.reviewedBy || null,
    }));

    return NextResponse.json({
      data,
      pagination: createPaginationMeta(page, limit, total),
    });
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

    // Validate with Zod schema
    const validation = validateRequest(createLeaveRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { startDate, endDate, leaveType, reason } = validation.data;

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return NextResponse.json(
        { error: "Start date must be before end date" },
        { status: 400 }
      );
    }

    // Validate not requesting leave for past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      return NextResponse.json(
        { error: "Cannot request leave for past dates" },
        { status: 400 }
      );
    }

    // Check for overlapping leave requests
    const overlapping = await LeaveRequest.findOne({
      userId: session.user.id,
      status: { $in: ["pending", "approved"] },
      $or: [{ startDate: { $lte: end }, endDate: { $gte: start } }],
    });

    if (overlapping) {
      return NextResponse.json(
        { error: "You already have a leave request for overlapping dates" },
        { status: 400 }
      );
    }

    // Check leave balance
    const requestedDays = calculateWorkingDays(start, end);
    const settings = await LeaveSettings.getSettings();
    const balance = await LeaveBalance.getOrCreateForUser(
      session.user.id,
      start.getFullYear(),
      settings.defaultQuotas
    );

    // Get remaining balance for this leave type
    const leaveTypeKey = leaveType as "sick" | "personal" | "annual";
    const remaining = balance.quotas[leaveTypeKey].total - balance.quotas[leaveTypeKey].used;
    const balanceWarning = requestedDays > remaining;

    // Create leave request
    const leaveRequest = await LeaveRequest.create({
      userId: session.user.id,
      startDate: start,
      endDate: end,
      leaveType,
      reason,
      status: "pending",
      daysRequested: requestedDays,
      exceedsBalance: balanceWarning,
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

    // Include balance warning in response if applicable
    const response: {
      data: typeof leaveRequest;
      warning?: string;
      balance?: {
        remaining: number;
        requested: number;
      };
    } = { data: leaveRequest };

    if (balanceWarning) {
      response.warning = `Your ${leaveType} leave balance (${remaining} days) is less than requested (${requestedDays} days). Request submitted for approval.`;
      response.balance = {
        remaining,
        requested: requestedDays,
      };
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error creating leave request:", error);
    return NextResponse.json(
      { error: "Failed to create leave request" },
      { status: 500 }
    );
  }
}
