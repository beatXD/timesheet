import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { LeaveBalance, LeaveSettings, User } from "@/models";

// PUT /api/admin/leave-balance/[userId] - Admin adjust user's leave balance
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId } = await params;
    const body = await request.json();
    const { year, quotas } = body;

    await connectDB();

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const targetYear = year || new Date().getFullYear();

    // Get default quotas from settings
    const settings = await LeaveSettings.getSettings();

    // Get or create balance
    const balance = await LeaveBalance.getOrCreateForUser(
      userId,
      targetYear,
      settings.defaultQuotas
    );

    // Update quotas if provided
    if (quotas) {
      if (quotas.sick) {
        if (typeof quotas.sick.total === "number" && quotas.sick.total >= 0) {
          balance.quotas.sick.total = quotas.sick.total;
        }
        if (typeof quotas.sick.used === "number" && quotas.sick.used >= 0) {
          balance.quotas.sick.used = quotas.sick.used;
        }
      }
      if (quotas.personal) {
        if (typeof quotas.personal.total === "number" && quotas.personal.total >= 0) {
          balance.quotas.personal.total = quotas.personal.total;
        }
        if (typeof quotas.personal.used === "number" && quotas.personal.used >= 0) {
          balance.quotas.personal.used = quotas.personal.used;
        }
      }
      if (quotas.annual) {
        if (typeof quotas.annual.total === "number" && quotas.annual.total >= 0) {
          balance.quotas.annual.total = quotas.annual.total;
        }
        if (typeof quotas.annual.used === "number" && quotas.annual.used >= 0) {
          balance.quotas.annual.used = quotas.annual.used;
        }
      }
    }

    await balance.save();

    // Return updated balance with remaining calculations
    const balanceData = {
      _id: balance._id,
      userId: balance.userId,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
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
    console.error("Error updating leave balance:", error);
    return NextResponse.json(
      { error: "Failed to update leave balance" },
      { status: 500 }
    );
  }
}
