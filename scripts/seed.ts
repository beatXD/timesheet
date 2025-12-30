import { config } from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Load .env.local
config({ path: ".env.local" });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set in .env.local");
  process.exit(1);
}

// User Schema (inline to avoid import issues)
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  emailVerified: { type: Date },
  image: { type: String },
  password: { type: String },
  role: { type: String, enum: ["admin", "leader", "user"], default: "user" },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
  contractRole: { type: String },
}, { timestamps: true });

const TeamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  leaderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Team = mongoose.models.Team || mongoose.model("Team", TeamSchema);

async function seed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected!");

  // Default password for all users: "password123"
  const hashedPassword = await bcrypt.hash("password123", 12);

  console.log("\nCreating users...");

  // Admin
  const admin = await User.findOneAndUpdate(
    { email: "admin@example.com" },
    {
      name: "Admin User",
      email: "admin@example.com",
      password: hashedPassword,
      role: "admin",
    },
    { upsert: true, new: true }
  );
  console.log(`  Admin: ${admin.email}`);

  // Team 1 - Leader
  const leader1 = await User.findOneAndUpdate(
    { email: "leader1@example.com" },
    {
      name: "Leader Team A",
      email: "leader1@example.com",
      password: hashedPassword,
      role: "leader",
    },
    { upsert: true, new: true }
  );
  console.log(`  Leader 1: ${leader1.email}`);

  // Team 1 - Members
  const user1 = await User.findOneAndUpdate(
    { email: "user1@example.com" },
    {
      name: "User A1",
      email: "user1@example.com",
      password: hashedPassword,
      role: "user",
    },
    { upsert: true, new: true }
  );
  console.log(`  User 1: ${user1.email}`);

  const user2 = await User.findOneAndUpdate(
    { email: "user2@example.com" },
    {
      name: "User A2",
      email: "user2@example.com",
      password: hashedPassword,
      role: "user",
    },
    { upsert: true, new: true }
  );
  console.log(`  User 2: ${user2.email}`);

  // Team 2 - Leader
  const leader2 = await User.findOneAndUpdate(
    { email: "leader2@example.com" },
    {
      name: "Leader Team B",
      email: "leader2@example.com",
      password: hashedPassword,
      role: "leader",
    },
    { upsert: true, new: true }
  );
  console.log(`  Leader 2: ${leader2.email}`);

  // Team 2 - Members
  const user3 = await User.findOneAndUpdate(
    { email: "user3@example.com" },
    {
      name: "User B1",
      email: "user3@example.com",
      password: hashedPassword,
      role: "user",
    },
    { upsert: true, new: true }
  );
  console.log(`  User 3: ${user3.email}`);

  const user4 = await User.findOneAndUpdate(
    { email: "user4@example.com" },
    {
      name: "User B2",
      email: "user4@example.com",
      password: hashedPassword,
      role: "user",
    },
    { upsert: true, new: true }
  );
  console.log(`  User 4: ${user4.email}`);

  console.log("\nCreating teams...");

  // Team A
  const teamA = await Team.findOneAndUpdate(
    { name: "Team A" },
    {
      name: "Team A",
      leaderId: leader1._id,
      memberIds: [user1._id, user2._id],
    },
    { upsert: true, new: true }
  );
  console.log(`  Team A: ${teamA.name} (Leader: ${leader1.name})`);

  // Update team members with teamId
  await User.updateMany(
    { _id: { $in: [user1._id, user2._id] } },
    { teamId: teamA._id }
  );

  // Team B
  const teamB = await Team.findOneAndUpdate(
    { name: "Team B" },
    {
      name: "Team B",
      leaderId: leader2._id,
      memberIds: [user3._id, user4._id],
    },
    { upsert: true, new: true }
  );
  console.log(`  Team B: ${teamB.name} (Leader: ${leader2.name})`);

  // Update team members with teamId
  await User.updateMany(
    { _id: { $in: [user3._id, user4._id] } },
    { teamId: teamB._id }
  );

  console.log("\n========================================");
  console.log("Seed completed!");
  console.log("========================================");
  console.log("\nAll users password: password123");
  console.log("\nAccounts created:");
  console.log("  - admin@example.com (Admin)");
  console.log("  - leader1@example.com (Leader Team A)");
  console.log("  - leader2@example.com (Leader Team B)");
  console.log("  - user1@example.com (User Team A)");
  console.log("  - user2@example.com (User Team A)");
  console.log("  - user3@example.com (User Team B)");
  console.log("  - user4@example.com (User Team B)");
  console.log("========================================\n");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
