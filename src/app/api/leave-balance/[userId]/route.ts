import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { LeaveBalance, LeaveSettings, User } from "@/models";

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
    if (!["admin", "leader"].includes(session.user.role)) {
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

    // Get or create balance for the user and year
    const balance = await LeaveBalance.getOrCreateForUser(
      userId,
      year,
      settings.defaultQuotas
    );

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
          used: balance.quotas.sick.used,
          remaining: balance.quotas.sick.total - balance.quotas.sick.used,
        },
        personal: {
          total: balance.quotas.personal.total,
          used: balance.quotas.personal.used,
          remaining: balance.quotas.personal.total - balance.quotas.personal.used,
        },
        annual: {
          total: balance.quotas.annual.total,
          used: balance.quotas.annual.used,
          remaining: balance.quotas.annual.total - balance.quotas.annual.used,
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
