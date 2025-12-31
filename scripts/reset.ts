import { config } from "dotenv";
import mongoose from "mongoose";

// Load .env.local
config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set in .env.local");
  process.exit(1);
}

// Collections to delete (keep users and teams)
const COLLECTIONS_TO_DELETE = [
  "timesheets",
  "leaverequests",
  "leavebalances",
  "leavesettings",
  "holidays",
  "notifications",
  "auditlogs",
];

async function reset() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected!\n");

  const db = mongoose.connection.db;
  if (!db) {
    console.error("Database connection failed");
    process.exit(1);
  }

  console.log("========================================");
  console.log("Reset Data (Keep Users & Teams)");
  console.log("========================================\n");

  for (const collectionName of COLLECTIONS_TO_DELETE) {
    try {
      const collection = db.collection(collectionName);
      const count = await collection.countDocuments();

      if (count > 0) {
        await collection.deleteMany({});
        console.log(`  Deleted ${count} documents from ${collectionName}`);
      } else {
        console.log(`  Skipped ${collectionName} (empty)`);
      }
    } catch (error) {
      // Collection might not exist
      console.log(`  Skipped ${collectionName} (not found)`);
    }
  }

  console.log("\n========================================");
  console.log("Reset completed!");
  console.log("========================================");
  console.log("\nKept:");
  console.log("  - users");
  console.log("  - teams");
  console.log("  - vendors");
  console.log("  - projects");
  console.log("\nDeleted:");
  COLLECTIONS_TO_DELETE.forEach((c) => console.log(`  - ${c}`));
  console.log("========================================\n");

  await mongoose.disconnect();
  process.exit(0);
}

reset().catch((err) => {
  console.error("Reset error:", err);
  process.exit(1);
});
