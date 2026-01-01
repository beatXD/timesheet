import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { StripeMock, planLimits, planPricing } from "@/lib/stripe-mock";
import type { SubscriptionPlan } from "@/types";

// GET /api/subscriptions - Get current user's subscription
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get payment history if user has a subscription
    let paymentHistory: Awaited<ReturnType<typeof StripeMock.getPaymentHistory>> = [];
    if (user.subscription?.stripeCustomerId) {
      paymentHistory = await StripeMock.getPaymentHistory(
        user.subscription.stripeCustomerId
      );
    }

    return NextResponse.json({
      data: {
        subscription: user.subscription || {
          plan: "free",
          status: "active",
          maxUsers: 1,
          maxTeams: 1,
        },
        paymentHistory,
        planPricing,
        planLimits,
      },
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    return NextResponse.json(
      { error: "Failed to get subscription" },
      { status: 500 }
    );
  }
}

// POST /api/subscriptions - Upgrade or change subscription
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, plan } = body;

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only admins can manage subscriptions
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Only team admins can manage subscriptions" },
        { status: 403 }
      );
    }

    switch (action) {
      case "upgrade": {
        const targetPlan = plan as SubscriptionPlan;
        if (!["pro", "enterprise"].includes(targetPlan)) {
          return NextResponse.json(
            { error: "Invalid plan" },
            { status: 400 }
          );
        }

        // Create checkout session
        const checkoutSession = await StripeMock.createCheckoutSession(
          session.user.id,
          targetPlan
        );

        return NextResponse.json({
          success: true,
          checkoutUrl: checkoutSession.url,
        });
      }

      case "change": {
        const targetPlan = plan as SubscriptionPlan;
        if (!["free", "pro", "enterprise"].includes(targetPlan)) {
          return NextResponse.json(
            { error: "Invalid plan" },
            { status: 400 }
          );
        }

        // Update subscription
        const limits = planLimits[targetPlan];
        const mockSub = await StripeMock.updateSubscription(
          user.subscription?.stripeSubscriptionId || "",
          targetPlan
        );

        user.subscription = {
          ...user.subscription,
          plan: targetPlan,
          status: "active",
          maxUsers: limits.maxUsers,
          maxTeams: limits.maxTeams,
          stripeSubscriptionId: mockSub.subscriptionId,
          currentPeriodEnd: mockSub.currentPeriodEnd,
        };
        await user.save();

        return NextResponse.json({
          success: true,
          subscription: user.subscription,
        });
      }

      case "cancel": {
        if (!user.subscription?.stripeSubscriptionId) {
          return NextResponse.json(
            { error: "No active subscription to cancel" },
            { status: 400 }
          );
        }

        const result = await StripeMock.cancelSubscription(
          user.subscription.stripeSubscriptionId
        );

        user.subscription.status = "cancelled";
        await user.save();

        return NextResponse.json({
          success: true,
          message: "Subscription cancelled",
          effectiveDate: result.effectiveDate,
        });
      }

      case "reactivate": {
        if (user.subscription?.status !== "cancelled") {
          return NextResponse.json(
            { error: "Subscription is not cancelled" },
            { status: 400 }
          );
        }

        await StripeMock.reactivateSubscription(
          user.subscription.stripeSubscriptionId || ""
        );

        user.subscription.status = "active";
        await user.save();

        return NextResponse.json({
          success: true,
          message: "Subscription reactivated",
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Subscription action error:", error);
    return NextResponse.json(
      { error: "Failed to process subscription action" },
      { status: 500 }
    );
  }
}
