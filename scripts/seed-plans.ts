import { config } from "dotenv";
import mongoose from "mongoose";

// Load .env.local
config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set in .env.local");
  process.exit(1);
}

// Default plans to seed
const DEFAULT_PLANS = [
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

async function seedPlans() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected!\n");

  const db = mongoose.connection.db;
  if (!db) {
    console.error("Database connection failed");
    process.exit(1);
  }

  const plansCollection = db.collection("plans");

  console.log("========================================");
  console.log("Seeding Default Plans");
  console.log("========================================\n");

  // Check existing plans
  const existingCount = await plansCollection.countDocuments();
  console.log(`Found ${existingCount} existing plans`);

  if (existingCount > 0) {
    console.log("\nPlans already exist. Updating existing plans...\n");

    for (const plan of DEFAULT_PLANS) {
      const result = await plansCollection.updateOne(
        { slug: plan.slug },
        { $set: plan },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        console.log(`  Created: ${plan.name} (${plan.slug})`);
      } else if (result.modifiedCount > 0) {
        console.log(`  Updated: ${plan.name} (${plan.slug})`);
      } else {
        console.log(`  Unchanged: ${plan.name} (${plan.slug})`);
      }
    }
  } else {
    console.log("\nNo existing plans. Creating default plans...\n");

    const result = await plansCollection.insertMany(
      DEFAULT_PLANS.map((plan) => ({
        ...plan,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    );

    console.log(`  Created ${result.insertedCount} plans`);
  }

  // Show final state
  console.log("\n========================================");
  console.log("Plans Summary:");
  console.log("========================================");

  const allPlans = await plansCollection.find().sort({ sortOrder: 1 }).toArray();
  for (const plan of allPlans) {
    console.log(
      `  ${plan.slug}: ${plan.name} - $${plan.monthlyPrice}/mo (${plan.maxUsers} users, ${plan.maxTeams} teams) ${plan.isActive ? "✓" : "✗"}`
    );
  }

  console.log("\n========================================");
  console.log("Seed completed!");
  console.log("========================================\n");

  await mongoose.disconnect();
  process.exit(0);
}

seedPlans().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
