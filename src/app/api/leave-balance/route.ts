import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { LeaveBalance, LeaveSettings, LeaveRequest } from "@/models";

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

// Helper to get default year (next year if December)
function getDefaultYear(): number {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  return currentMonth === 11 ? currentYear + 1 : currentYear;
}

// GET /api/leave-balance - Get current user's leave balance
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Get year from query param or use default
    const searchParams = request.nextUrl.searchParams;
    const yearParam = searchParams.get("year");
    const displayYear = yearParam ? parseInt(yearParam, 10) : getDefaultYear();

    // Get default quotas from settings
    const settings = await LeaveSettings.getSettings();

    // Get or create balance for current user and year (for total quotas)
    const balance = await LeaveBalance.getOrCreateForUser(
      session.user.id,
      displayYear,
      settings.defaultQuotas
    );

    // Calculate used days from approved leave requests (source of truth)
    const yearStart = new Date(`${displayYear}-01-01`);
    const yearEnd = new Date(`${displayYear}-12-31`);

    const approvedRequests = await LeaveRequest.find({
      userId: session.user.id,
      status: "approved",
      startDate: { $gte: yearStart, $lte: yearEnd },
    }).lean();

    // Calculate used days by leave type
    const usedDays = { sick: 0, personal: 0, annual: 0 };
    for (const request of approvedRequests) {
      const leaveType = request.leaveType as "sick" | "personal" | "annual";
      const days = calculateWorkingDays(
        new Date(request.startDate),
        new Date(request.endDate)
      );
      usedDays[leaveType] += days;
    }

    // Calculate remaining for each type
    const balanceData = {
      _id: balance._id,
      userId: balance.userId,
      year: balance.year,
      quotas: {
        sick: {
          total: balance.quotas.sick.total,
          used: usedDays.sick,
          remaining: balance.quotas.sick.total - usedDays.sick,
        },
        personal: {
          total: balance.quotas.personal.total,
          used: usedDays.personal,
          remaining: balance.quotas.personal.total - usedDays.personal,
        },
        annual: {
          total: balance.quotas.annual.total,
          used: usedDays.annual,
          remaining: balance.quotas.annual.total - usedDays.annual,
        },
      },
    };

    return NextResponse.json({ data: balanceData });
  } catch (error) {
    console.error("Error fetching leave balance:", error);
    return NextResponse.json(
      { error: "Failed to fetch leave balance" },
      { status: 500 }
    );
  }
}
