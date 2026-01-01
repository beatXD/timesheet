/**
 * Migration Script: Simplify Timesheet Status
 *
 * This script migrates existing timesheets from the old 6-status workflow
 * to the new simplified 4-status workflow:
 *
 * Old: draft → submitted → approved → team_submitted → final_approved
 * New: draft → submitted → approved (leader approve is final)
 *
 * Changes:
 * - team_submitted → approved
 * - final_approved → approved
 * - Removes deprecated fields: teamSubmittedAt, teamSubmittedBy, finalApprovedAt, finalApprovedBy
 */

import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables
dotenv.config({ path: resolve(__dirname, "../.env.local") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not defined in .env.local");
  process.exit(1);
}

async function migrate() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI as string);
  console.log("Connected successfully");

  const db = mongoose.connection.db;
  if (!db) {
    console.error("Database connection not established");
    process.exit(1);
  }

  const timesheetsCollection = db.collection("timesheets");

  // Count documents to migrate
  const teamSubmittedCount = await timesheetsCollection.countDocuments({
    status: "team_submitted",
  });
  const finalApprovedCount = await timesheetsCollection.countDocuments({
    status: "final_approved",
  });

  console.log(`Found ${teamSubmittedCount} timesheets with status 'team_submitted'`);
  console.log(`Found ${finalApprovedCount} timesheets with status 'final_approved'`);

  if (teamSubmittedCount === 0 && finalApprovedCount === 0) {
    console.log("No documents to migrate. Exiting...");
    await mongoose.disconnect();
    return;
  }

  // Migrate team_submitted to approved
  if (teamSubmittedCount > 0) {
    console.log("\nMigrating 'team_submitted' → 'approved'...");
    const result1 = await timesheetsCollection.updateMany(
      { status: "team_submitted" },
      {
        $set: { status: "approved" },
        $unset: {
          teamSubmittedAt: "",
          teamSubmittedBy: "",
          finalApprovedAt: "",
          finalApprovedBy: "",
        },
      }
    );
    console.log(`  Updated ${result1.modifiedCount} documents`);
  }

  // Migrate final_approved to approved
  if (finalApprovedCount > 0) {
    console.log("\nMigrating 'final_approved' → 'approved'...");
    const result2 = await timesheetsCollection.updateMany(
      { status: "final_approved" },
      {
        $set: { status: "approved" },
        $unset: {
          teamSubmittedAt: "",
          teamSubmittedBy: "",
          finalApprovedAt: "",
          finalApprovedBy: "",
        },
      }
    );
    console.log(`  Updated ${result2.modifiedCount} documents`);
  }

  // Also clean up deprecated fields from all other documents
  console.log("\nCleaning up deprecated fields from remaining documents...");
  const cleanupResult = await timesheetsCollection.updateMany(
    {
      $or: [
        { teamSubmittedAt: { $exists: true } },
        { teamSubmittedBy: { $exists: true } },
        { finalApprovedAt: { $exists: true } },
        { finalApprovedBy: { $exists: true } },
      ],
    },
    {
      $unset: {
        teamSubmittedAt: "",
        teamSubmittedBy: "",
        finalApprovedAt: "",
        finalApprovedBy: "",
      },
    }
  );
  console.log(`  Cleaned ${cleanupResult.modifiedCount} documents`);

  // Drop old index if exists
  console.log("\nDropping deprecated index...");
  try {
    await timesheetsCollection.dropIndex("status_1_teamSubmittedAt_-1");
    console.log("  Dropped index 'status_1_teamSubmittedAt_-1'");
  } catch {
    console.log("  Index 'status_1_teamSubmittedAt_-1' does not exist or already dropped");
  }

  console.log("\nMigration completed successfully!");
  await mongoose.disconnect();
}

migrate().catch((error) => {
  console.error("Migration failed:", error);
  mongoose.disconnect();
  process.exit(1);
});
