import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { LeaveRequest, Team, User, LeaveBalance, LeaveSettings, Timesheet, AuditLog } from "@/models";
import type { LeaveType } from "@/types";
import { parsePaginationParams, createPaginationMeta } from "@/lib/pagination";
import { sendLeaveRequestEmail } from "@/lib/email";
import { createLeaveRequestSchema, validateRequest } from "@/lib/validation/schemas";
import { notifyPendingApproval } from "@/lib/notifications";

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
      // Leaders can see their own and their team members' requests
      const teams = await Team.find({ leaderId: session.user.id });
      if (teams.length > 0) {
        const allMemberIds = teams.flatMap((t) =>
          t.memberIds.map((id: { toString: () => string }) => id.toString())
        );
        // Include leader's own ID in the filter
        filter.userId = { $in: [...allMemberIds, session.user.id] };
      } else {
        // If not leading any team, show only own requests
        filter.userId = session.user.id;
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

    // Check for existing leave entries in timesheets
    const overlappingTimesheetLeave = await checkExistingLeaveInTimesheets({
      userId: session.user.id,
      startDate: start,
      endDate: end,
    });

    if (overlappingTimesheetLeave) {
      return NextResponse.json(
        { error: `You already have leave recorded on ${overlappingTimesheetLeave.date} in your timesheet` },
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

    // Block if exceeds balance
    if (requestedDays > remaining) {
      return NextResponse.json(
        {
          error: `Insufficient ${leaveType} leave balance. You have ${remaining} day(s) remaining but requested ${requestedDays} day(s).`,
          code: "INSUFFICIENT_BALANCE",
          details: {
            leaveType,
            remaining,
            requested: requestedDays,
          },
        },
        { status: 400 }
      );
    }

    const isLeader = session.user.role === "leader";

    // Create leave request - auto-approved for leaders
    const leaveRequest = await LeaveRequest.create({
      userId: session.user.id,
      startDate: start,
      endDate: end,
      leaveType,
      reason,
      status: isLeader ? "approved" : "pending",
      daysRequested: requestedDays,
      ...(isLeader && {
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        daysApproved: requestedDays,
      }),
    });

    // If leader, auto-approve: deduct balance and add to timesheet
    if (isLeader) {
      // Deduct from balance
      balance.quotas[leaveTypeKey].used += requestedDays;
      balance.markModified("quotas");
      await balance.save();

      // Log the auto-approval
      await AuditLog.logAction({
        entityType: "leave_request",
        entityId: leaveRequest._id,
        action: "auto_approve",
        fromStatus: "pending",
        toStatus: "approved",
        performedBy: session.user.id,
        metadata: { daysApproved: requestedDays, leaveType },
      });

      // Add leave entries to timesheet
      await addLeaveToTimesheet({
        userId: session.user.id,
        startDate: start,
        endDate: end,
        leaveType,
        reason,
      });
    } else {
      // Regular user: notify team leader(s)
      const teams = await Team.find({ memberIds: session.user.id }).populate(
        "leaderId",
        "name email"
      );

      const currentUser = await User.findById(session.user.id).lean();
      const leaderIds: string[] = [];

      for (const team of teams) {
        const leader = team.leaderId as unknown as {
          _id: string;
          name: string;
          email: string;
        };
        if (leader?._id) {
          leaderIds.push(leader._id.toString());
        }
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
          }
        }
      }

      // Send in-app notification to leaders
      if (leaderIds.length > 0) {
        try {
          await notifyPendingApproval(
            leaderIds,
            currentUser?.name || session.user.name || "User",
            "leave"
          );
        } catch (notifyError) {
          console.error("Failed to send notification:", notifyError);
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

// Helper function to add leave entries to timesheet
async function addLeaveToTimesheet(params: {
  userId: string;
  startDate: Date;
  endDate: Date;
  leaveType: string;
  reason?: string;
}) {
  const { userId, startDate, endDate, leaveType, reason } = params;

  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();
    const day = currentDate.getDate();

    // Skip weekends
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // Find or create timesheet for this month
    const timesheet = await Timesheet.findOneAndUpdate(
      { userId, month, year },
      {
        $setOnInsert: {
          status: "draft",
          entries: [],
          totalBaseHours: 0,
          totalAdditionalHours: 0,
        },
      },
      { upsert: true, new: true }
    );

    // Skip if timesheet already submitted/approved
    if (["approved", "final_approved", "team_submitted"].includes(timesheet.status)) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // Check if entry for this day already exists
    const existingEntryIndex = timesheet.entries.findIndex(
      (e: { date: number }) => e.date === day
    );

    const leaveEntry = {
      date: day,
      type: "leave" as const,
      leaveType: leaveType as LeaveType,
      task: "",
      timeIn: "",
      timeOut: "",
      baseHours: 8,
      additionalHours: 0,
      remark: reason || "",
    };

    if (existingEntryIndex >= 0) {
      timesheet.entries[existingEntryIndex] = leaveEntry;
    } else {
      timesheet.entries.push(leaveEntry);
    }

    // Recalculate totals
    timesheet.totalBaseHours = timesheet.entries.reduce(
      (sum: number, e: { baseHours?: number }) => sum + (e.baseHours || 0),
      0
    );
    timesheet.totalAdditionalHours = timesheet.entries.reduce(
      (sum: number, e: { additionalHours?: number }) => sum + (e.additionalHours || 0),
      0
    );

    await timesheet.save();
    currentDate.setDate(currentDate.getDate() + 1);
  }
}

// Helper function to check for existing leave entries in timesheets
async function checkExistingLeaveInTimesheets(params: {
  userId: string;
  startDate: Date;
  endDate: Date;
}): Promise<{ date: string } | null> {
  const { userId, startDate, endDate } = params;

  // Get all months covered by the date range
  const months: { month: number; year: number }[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    const month = current.getMonth() + 1;
    const year = current.getFullYear();
    if (!months.find((m) => m.month === month && m.year === year)) {
      months.push({ month, year });
    }
    current.setMonth(current.getMonth() + 1);
  }

  // Check each relevant timesheet for leave entries
  for (const { month, year } of months) {
    const timesheet = await Timesheet.findOne({ userId, month, year });
    if (!timesheet) continue;

    // Check each date in the range that falls in this month
    const checkDate = new Date(startDate);
    while (checkDate <= endDate) {
      if (
        checkDate.getMonth() + 1 === month &&
        checkDate.getFullYear() === year
      ) {
        const day = checkDate.getDate();
        const dayOfWeek = checkDate.getDay();

        // Skip weekends
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          const existingEntry = timesheet.entries.find(
            (e: { date: number; type: string }) =>
              e.date === day && e.type === "leave"
          );

          if (existingEntry) {
            return {
              date: `${day}/${month}/${year}`,
            };
          }
        }
      }
      checkDate.setDate(checkDate.getDate() + 1);
    }
  }

  return null;
}
