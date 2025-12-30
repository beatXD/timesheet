import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { LeaveBalance, LeaveSettings } from "@/models";

// GET /api/leave-balance - Get current user's leave balance
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const currentYear = new Date().getFullYear();

    // Get default quotas from settings
    const settings = await LeaveSettings.getSettings();

    // Get or create balance for current user and year
    const balance = await LeaveBalance.getOrCreateForUser(
      session.user.id,
      currentYear,
      settings.defaultQuotas
    );

    // Calculate remaining for each type
    const balanceData = {
      _id: balance._id,
      userId: balance.userId,
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
    console.error("Error fetching leave balance:", error);
    return NextResponse.json(
      { error: "Failed to fetch leave balance" },
      { status: 500 }
    );
  }
}
