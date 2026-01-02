import { config } from "dotenv";
import mongoose from "mongoose";

// Load .env.local
config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set in .env.local");
  process.exit(1);
}

async function migrate() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected!\n");

  const db = mongoose.connection.db;
  if (!db) {
    console.error("Database connection failed");
    process.exit(1);
  }

  const usersCollection = db.collection("users");
  const teamsCollection = db.collection("teams");

  console.log("========================================");
  console.log("Role Migration: admin/leader/user → super_admin/admin/user");
  console.log("========================================\n");

  // Step 1: Migrate admin → super_admin
  console.log("Step 1: Migrating 'admin' → 'super_admin'...");
  const adminResult = await usersCollection.updateMany(
    { role: "admin" },
    { $set: { role: "super_admin" } }
  );
  console.log(`  Updated ${adminResult.modifiedCount} users from 'admin' to 'super_admin'\n`);

  // Step 2: Migrate leader → admin with Pro subscription
  console.log("Step 2: Migrating 'leader' → 'admin' with Team subscription...");
  const leaderResult = await usersCollection.updateMany(
    { role: "leader" },
    {
      $set: {
        role: "admin",
        subscription: {
          plan: "team",
          status: "active",
          maxUsers: 5,
          maxTeams: 1,
        },
      },
    }
  );
  console.log(`  Updated ${leaderResult.modifiedCount} users from 'leader' to 'admin'\n`);

  // Step 3: Add Free subscription to standalone users (not in any team)
  console.log("Step 3: Adding Free subscription to standalone users...");
  const standaloneResult = await usersCollection.updateMany(
    {
      role: "user",
      subscription: { $exists: false },
      $or: [
        { teamIds: { $exists: false } },
        { teamIds: { $size: 0 } },
      ],
    },
    {
      $set: {
        subscription: {
          plan: "free",
          status: "active",
          maxUsers: 1,
          maxTeams: 1,
        },
      },
    }
  );
  console.log(`  Updated ${standaloneResult.modifiedCount} standalone users with Free subscription\n`);

  // Step 4: Rename Team.leaderId → Team.adminId (if old field exists)
  console.log("Step 4: Checking for Team.leaderId → Team.adminId migration...");
  const teamsWithLeaderId = await teamsCollection.countDocuments({
    leaderId: { $exists: true },
  });

  if (teamsWithLeaderId > 0) {
    const teamResult = await teamsCollection.updateMany(
      { leaderId: { $exists: true } },
      { $rename: { leaderId: "adminId" } }
    );
    console.log(`  Renamed 'leaderId' to 'adminId' in ${teamResult.modifiedCount} teams\n`);
  } else {
    console.log("  No teams with 'leaderId' found (already migrated or using 'adminId')\n");
  }

  // Summary
  console.log("========================================");
  console.log("Migration Summary:");
  console.log("========================================");

  const superAdminCount = await usersCollection.countDocuments({ role: "super_admin" });
  const adminCount = await usersCollection.countDocuments({ role: "admin" });
  const userCount = await usersCollection.countDocuments({ role: "user" });

  console.log(`  super_admin: ${superAdminCount}`);
  console.log(`  admin: ${adminCount}`);
  console.log(`  user: ${userCount}`);

  const freePlanCount = await usersCollection.countDocuments({ "subscription.plan": "free" });
  const teamPlanCount = await usersCollection.countDocuments({ "subscription.plan": "team" });
  const enterprisePlanCount = await usersCollection.countDocuments({ "subscription.plan": "enterprise" });

  console.log("");
  console.log("Subscription Plans:");
  console.log(`  free: ${freePlanCount}`);
  console.log(`  team: ${teamPlanCount}`);
  console.log(`  enterprise: ${enterprisePlanCount}`);

  console.log("\n========================================");
  console.log("Migration completed successfully!");
  console.log("========================================\n");

  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
