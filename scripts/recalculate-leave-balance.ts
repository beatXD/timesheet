import { config } from "dotenv";
import mongoose from "mongoose";

// Load .env.local
config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set in .env.local");
  process.exit(1);
}

// Helper function to calculate working days between two dates
function calculateWorkingDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

async function recalculateLeaveBalances() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected!\n");

  const db = mongoose.connection.db;
  if (!db) {
    console.error("Database connection failed");
    process.exit(1);
  }

  console.log("========================================");
  console.log("Recalculate Leave Balances");
  console.log("========================================\n");

  const currentYear = new Date().getFullYear();

  // Get all approved leave requests for current year
  const leaveRequestsCollection = db.collection("leaverequests");
  const leaveBalancesCollection = db.collection("leavebalances");

  const approvedRequests = await leaveRequestsCollection
    .find({
      status: "approved",
      startDate: {
        $gte: new Date(`${currentYear}-01-01`),
        $lt: new Date(`${currentYear + 1}-01-01`),
      },
    })
    .toArray();

  console.log(`Found ${approvedRequests.length} approved leave requests for ${currentYear}\n`);

  // Group by userId and leaveType
  const usageMap: Record<string, { sick: number; personal: number; annual: number }> = {};

  for (const request of approvedRequests) {
    const userId = request.userId.toString();
    const leaveType = request.leaveType as "sick" | "personal" | "annual";
    const days = calculateWorkingDays(
      new Date(request.startDate),
      new Date(request.endDate)
    );

    if (!usageMap[userId]) {
      usageMap[userId] = { sick: 0, personal: 0, annual: 0 };
    }
    usageMap[userId][leaveType] += days;

    console.log(
      `  ${userId}: ${leaveType} +${days} days (${request.startDate.toISOString().split("T")[0]} - ${request.endDate.toISOString().split("T")[0]})`
    );
  }

  console.log("\n----------------------------------------");
  console.log("Updating leave balances...\n");

  // Update each user's balance
  for (const [userId, usage] of Object.entries(usageMap)) {
    const balance = await leaveBalancesCollection.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      year: currentYear,
    });

    if (balance) {
      // Update existing balance
      const result = await leaveBalancesCollection.updateOne(
        { _id: balance._id },
        {
          $set: {
            "quotas.sick.used": usage.sick,
            "quotas.personal.used": usage.personal,
            "quotas.annual.used": usage.annual,
          },
        }
      );

      console.log(`Updated ${userId}:`);
      console.log(`  sick: ${balance.quotas?.sick?.used || 0} -> ${usage.sick}`);
      console.log(`  personal: ${balance.quotas?.personal?.used || 0} -> ${usage.personal}`);
      console.log(`  annual: ${balance.quotas?.annual?.used || 0} -> ${usage.annual}`);
    } else {
      // Create new balance record
      await leaveBalancesCollection.insertOne({
        userId: new mongoose.Types.ObjectId(userId),
        year: currentYear,
        quotas: {
          sick: { total: 30, used: usage.sick },
          personal: { total: 3, used: usage.personal },
          annual: { total: 6, used: usage.annual },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`Created balance for ${userId}:`);
      console.log(`  sick: ${usage.sick}/30`);
      console.log(`  personal: ${usage.personal}/3`);
      console.log(`  annual: ${usage.annual}/6`);
    }
  }

  console.log("\n========================================");
  console.log("Recalculation completed!");
  console.log("========================================\n");

  await mongoose.disconnect();
  process.exit(0);
}

recalculateLeaveBalances().catch((err) => {
  console.error("Recalculation error:", err);
  process.exit(1);
});
