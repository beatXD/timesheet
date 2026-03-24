/**
 * Plan Helper Functions
 * Fetches plans from database with fallback to defaults
 */

import { connectDB } from "@/lib/db";
import { Plan } from "@/models";
import type { IPlan } from "@/types";

// Default plans (used for seeding and as fallback)
export const DEFAULT_PLANS = [
  {
    slug: "free",
    name: "Free",
    description: "For individuals",
    monthlyPrice: 20,
    maxUsers: 1,
    maxTeams: 1,
    features: [
      "Personal time tracking",
      "Thai holidays included",
      "PDF & Excel export",
    ],
    isActive: true,
    sortOrder: 0,
  },
  {
    slug: "team",
    name: "Team",
    description: "For small teams",
    monthlyPrice: 40,
    maxUsers: 5,
    maxTeams: 1,
    features: [
      "Up to 5 users",
      "1 Team",
      "Approval workflow",
      "Leave management",
      "Priority support",
    ],
    isActive: true,
    sortOrder: 1,
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    description: "For large organizations",
    monthlyPrice: 99,
    maxUsers: 100,
    maxTeams: 10,
    features: [
      "Unlimited users",
      "Unlimited teams",
      "Advanced reports",
      "API access",
      "Dedicated support",
    ],
    isActive: true,
    sortOrder: 2,
  },
];

// Cache for plans (in-memory, refreshed periodically)
let plansCache: IPlan[] | null = null;
let plansCacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

/**
 * Get all active plans from database
 */
export async function getActivePlans(): Promise<IPlan[]> {
  // Check cache
  if (plansCache && Date.now() - plansCacheTime < CACHE_TTL) {
    return plansCache;
  }

  try {
    await connectDB();
    const plans = await Plan.find({ isActive: true })
      .sort({ sortOrder: 1 })
      .lean();

    if (plans.length > 0) {
      plansCache = plans as IPlan[];
      plansCacheTime = Date.now();
      return plansCache;
    }
  } catch (error) {
    console.error("Error fetching plans:", error);
  }

  // Return defaults if no plans in database
  return DEFAULT_PLANS as unknown as IPlan[];
}

/**
 * Get a single plan by slug
 */
export async function getPlanBySlug(slug: string): Promise<IPlan | null> {
  const plans = await getActivePlans();
  return plans.find((p) => p.slug === slug) || null;
}

/**
 * Get plan limits (maxUsers, maxTeams) for a given plan slug
 */
export async function getPlanLimits(
  slug: string
): Promise<{ maxUsers: number; maxTeams: number }> {
  const plan = await getPlanBySlug(slug);
  if (plan) {
    return { maxUsers: plan.maxUsers, maxTeams: plan.maxTeams };
  }
  // Fallback to free plan limits
  return { maxUsers: 1, maxTeams: 1 };
}

/**
 * Get plan pricing for a given plan slug
 */
export async function getPlanPricing(slug: string): Promise<number> {
  const plan = await getPlanBySlug(slug);
  return plan?.monthlyPrice || 0;
}

/**
 * Clear the plans cache (call after updating plans)
 */
export function clearPlansCache() {
  plansCache = null;
  plansCacheTime = 0;
}

/**
 * Seed default plans if none exist
 */
export async function seedDefaultPlans(): Promise<void> {
  await connectDB();
  const existingCount = await Plan.countDocuments();

  if (existingCount === 0) {
    await Plan.insertMany(DEFAULT_PLANS);
    console.log(`Seeded ${DEFAULT_PLANS.length} default plans`);
  }
}
