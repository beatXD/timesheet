import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User, LeaveBalance, LeaveSettings } from "@/models";
import { verifyCronSecret } from "@/lib/cron";

// GET /api/cron/reset-leave-balance
// This endpoint should be called by a cron job (e.g., Vercel Cron) on the 1st of each month
export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Get leave settings to check reset month
    const settings = await LeaveSettings.getSettings();
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // 1-12
    const currentYear = currentDate.getFullYear();

    // Only reset if current month matches reset month
    if (currentMonth !== settings.resetMonth) {
      return NextResponse.json({
        message: `Not reset month. Reset month is ${settings.resetMonth}, current month is ${currentMonth}`,
        skipped: true,
      });
    }

    // Get all active users
    const users = await User.find({}).select("_id").lean();

    let created = 0;
    let skipped = 0;

    // Create new balance records for the new year
    for (const user of users) {
      // Check if balance already exists for this year
      const existingBalance = await (LeaveBalance as any).findOne({
        userId: user._id,
        year: currentYear,
      });

      if (existingBalance) {
        skipped++;
        continue;
      }

      // Create new balance with default quotas
      await (LeaveBalance as any).create({
        userId: user._id,
        year: currentYear,
        quotas: {
          sick: { total: settings.defaultQuotas.sick, used: 0 },
          personal: { total: settings.defaultQuotas.personal, used: 0 },
          annual: { total: settings.defaultQuotas.annual, used: 0 },
        },
      });

      created++;
    }

    console.log(
      `[Cron] Leave balance reset completed: ${created} created, ${skipped} skipped`
    );

    return NextResponse.json({
      success: true,
      message: `Leave balance reset for year ${currentYear}`,
      stats: {
        totalUsers: users.length,
        created,
        skipped,
      },
    });
  } catch (error) {
    console.error("[Cron] Error resetting leave balance:", error);
    return NextResponse.json(
      { error: "Failed to reset leave balance" },
      { status: 500 }
    );
  }
}

// POST endpoint for manual trigger (admin only)
export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json().catch(() => ({}));
    const targetYear = body.year || new Date().getFullYear();

    // Get leave settings
    const settings = await LeaveSettings.getSettings();

    // Get all active users
    const users = await User.find({}).select("_id").lean();

    let created = 0;
    let skipped = 0;

    // Create new balance records for the specified year
    for (const user of users) {
      // Check if balance already exists for this year
      const existingBalance = await (LeaveBalance as any).findOne({
        userId: user._id,
        year: targetYear,
      });

      if (existingBalance) {
        skipped++;
        continue;
      }

      // Create new balance with default quotas
      await (LeaveBalance as any).create({
        userId: user._id,
        year: targetYear,
        quotas: {
          sick: { total: settings.defaultQuotas.sick, used: 0 },
          personal: { total: settings.defaultQuotas.personal, used: 0 },
          annual: { total: settings.defaultQuotas.annual, used: 0 },
        },
      });

      created++;
    }

    console.log(
      `[Cron] Manual leave balance reset for year ${targetYear}: ${created} created, ${skipped} skipped`
    );

    return NextResponse.json({
      success: true,
      message: `Leave balance initialized for year ${targetYear}`,
      stats: {
        totalUsers: users.length,
        created,
        skipped,
      },
    });
  } catch (error) {
    console.error("[Cron] Error in manual leave balance reset:", error);
    return NextResponse.json(
      { error: "Failed to reset leave balance" },
      { status: 500 }
    );
  }
}
