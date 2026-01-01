import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { LeaveBalance, LeaveSettings, LeaveRequest, User } from "@/models";

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

// GET /api/leave-balance/[userId] - Get specific user's leave balance (admin/leader only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin and leader can view other users' balances
    if (!["super_admin", "admin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId } = await params;
    await connectDB();

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);

    // Get default quotas from settings
    const settings = await LeaveSettings.getSettings();

    // Get or create balance for the user and year (for total quotas)
    const balance = await LeaveBalance.getOrCreateForUser(
      userId,
      year,
      settings.defaultQuotas
    );

    // Calculate used days from approved leave requests (source of truth)
    const yearStart = new Date(`${year}-01-01`);
    const yearEnd = new Date(`${year}-12-31`);

    const approvedRequests = await LeaveRequest.find({
      userId,
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
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
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
    console.error("Error fetching user leave balance:", error);
    return NextResponse.json(
      { error: "Failed to fetch leave balance" },
      { status: 500 }
    );
  }
}
