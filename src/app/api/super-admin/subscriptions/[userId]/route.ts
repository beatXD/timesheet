import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { Permissions } from "@/lib/permissions";
import { planLimits } from "@/lib/stripe-mock";
import type { SubscriptionPlan } from "@/types";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

// GET /api/super-admin/subscriptions/[userId] - Get user subscription
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!Permissions.canManageSubscriptions(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId } = await params;

    await connectDB();

    const user = await User.findById(userId).select("name email subscription");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
        },
        subscription: user.subscription || {
          plan: "free",
          status: "active",
          maxUsers: 1,
          maxTeams: 1,
        },
      },
    });
  } catch (error) {
    console.error("Get user subscription error:", error);
    return NextResponse.json(
      { error: "Failed to get subscription" },
      { status: 500 }
    );
  }
}

// PUT /api/super-admin/subscriptions/[userId] - Update user subscription
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!Permissions.canManageSubscriptions(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId } = await params;
    const body = await request.json();
    const { plan, status, maxUsers, maxTeams } = body;

    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only allow updating admin subscriptions
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Can only manage admin subscriptions" },
        { status: 400 }
      );
    }

    // Update subscription
    const targetPlan = plan as SubscriptionPlan;
    const limits = planLimits[targetPlan] || planLimits.free;

    user.subscription = {
      ...user.subscription,
      plan: targetPlan,
      status: status || user.subscription?.status || "active",
      maxUsers: maxUsers || limits.maxUsers,
      maxTeams: maxTeams || limits.maxTeams,
      // Keep existing Stripe IDs if present
      stripeCustomerId: user.subscription?.stripeCustomerId,
      stripeSubscriptionId: user.subscription?.stripeSubscriptionId,
      currentPeriodEnd: user.subscription?.currentPeriodEnd,
    };

    await user.save();

    return NextResponse.json({
      success: true,
      subscription: user.subscription,
    });
  } catch (error) {
    console.error("Update subscription error:", error);
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 }
    );
  }
}
