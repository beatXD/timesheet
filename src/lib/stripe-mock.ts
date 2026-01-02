/**
 * Mock Stripe Service
 * This is a mockup for development. Replace with real Stripe integration for production.
 */

import type { SubscriptionPlan } from "@/types";
import { getActivePlans, getPlanBySlug } from "@/lib/plans";

interface MockCheckoutSession {
  sessionId: string;
  url: string;
}

interface MockSubscription {
  subscriptionId: string;
  customerId: string;
  plan: SubscriptionPlan;
  status: "active" | "cancelled" | "past_due";
  currentPeriodEnd: Date;
}

// Default plan pricing (fallback, prefer database)
export const planPricing: Record<string, { monthly: number; name: string }> = {
  free: { monthly: 0, name: "Free" },
  team: { monthly: 990, name: "Team" },
  enterprise: { monthly: 4990, name: "Enterprise" },
};

// Default plan limits (fallback, prefer database)
export const planLimits: Record<string, { maxUsers: number; maxTeams: number }> = {
  free: { maxUsers: 1, maxTeams: 1 },
  team: { maxUsers: 5, maxTeams: 1 },
  enterprise: { maxUsers: 100, maxTeams: 10 },
};

/**
 * Get plan limits from database (with fallback)
 */
export async function getPlanLimitsFromDB(planSlug: string): Promise<{ maxUsers: number; maxTeams: number }> {
  const plan = await getPlanBySlug(planSlug);
  if (plan) {
    return { maxUsers: plan.maxUsers, maxTeams: plan.maxTeams };
  }
  return planLimits[planSlug] || { maxUsers: 1, maxTeams: 1 };
}

/**
 * Get all plans from database for display
 */
export async function getAllPlansFromDB() {
  return getActivePlans();
}

export const StripeMock = {
  /**
   * Create a checkout session for subscription
   */
  createCheckoutSession: async (
    userId: string,
    plan: SubscriptionPlan
  ): Promise<MockCheckoutSession> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const sessionId = `cs_mock_${Date.now()}_${userId}`;
    return {
      sessionId,
      url: `/api/subscriptions/checkout-complete?session_id=${sessionId}&plan=${plan}`,
    };
  },

  /**
   * Create a subscription for a customer
   */
  createSubscription: async (
    customerId: string,
    plan: SubscriptionPlan
  ): Promise<MockSubscription> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      subscriptionId: `sub_mock_${Date.now()}`,
      customerId,
      plan,
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };
  },

  /**
   * Update subscription plan
   */
  updateSubscription: async (
    subscriptionId: string,
    newPlan: SubscriptionPlan
  ): Promise<MockSubscription> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      subscriptionId,
      customerId: `cus_mock_${Date.now()}`,
      plan: newPlan,
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  },

  /**
   * Cancel subscription
   */
  cancelSubscription: async (
    subscriptionId: string
  ): Promise<{ cancelled: boolean; effectiveDate: Date }> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      cancelled: true,
      effectiveDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // End of current period
    };
  },

  /**
   * Reactivate cancelled subscription
   */
  reactivateSubscription: async (
    subscriptionId: string
  ): Promise<MockSubscription> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      subscriptionId,
      customerId: `cus_mock_${Date.now()}`,
      plan: "team",
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  },

  /**
   * Get mock payment history
   */
  getPaymentHistory: async (customerId: string) => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Return mock payment history
    const now = Date.now();
    return [
      {
        id: `pi_mock_1`,
        amount: 990,
        currency: "thb",
        status: "succeeded",
        description: "Team Plan - Monthly",
        created: new Date(now - 30 * 24 * 60 * 60 * 1000),
      },
      {
        id: `pi_mock_2`,
        amount: 990,
        currency: "thb",
        status: "succeeded",
        description: "Team Plan - Monthly",
        created: new Date(now - 60 * 24 * 60 * 60 * 1000),
      },
      {
        id: `pi_mock_3`,
        amount: 990,
        currency: "thb",
        status: "succeeded",
        description: "Team Plan - Monthly",
        created: new Date(now - 90 * 24 * 60 * 60 * 1000),
      },
    ];
  },
};
