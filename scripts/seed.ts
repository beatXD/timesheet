import { config } from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Load .env.local
config({ path: ".env.local" });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI as string;
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
  role: { type: String, enum: ["super_admin", "admin", "user"], default: "user" },
  teamIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Team" }],
}, { timestamps: true });

// Holiday Schema
const HolidaySchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: Date, required: true },
  type: { type: String, enum: ["public", "company"], default: "public" },
}, { timestamps: true });

// Plan Schema
const PlanSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  monthlyPrice: { type: Number, required: true, default: 0 },
  maxUsers: { type: Number, required: true, default: 1 },
  maxTeams: { type: Number, required: true, default: 1 },
  features: [{ type: String }],
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  stripePriceId: { type: String },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Holiday = mongoose.models.Holiday || mongoose.model("Holiday", HolidaySchema);
const Plan = mongoose.models.Plan || mongoose.model("Plan", PlanSchema);

// Thai public holidays for 2025
const thaiHolidays2025 = [
  { name: "วันขึ้นปีใหม่", date: new Date("2025-01-01"), type: "public" },
  { name: "วันมาฆบูชา", date: new Date("2025-02-12"), type: "public" },
  { name: "วันจักรี", date: new Date("2025-04-06"), type: "public" },
  { name: "วันสงกรานต์", date: new Date("2025-04-13"), type: "public" },
  { name: "วันสงกรานต์", date: new Date("2025-04-14"), type: "public" },
  { name: "วันสงกรานต์", date: new Date("2025-04-15"), type: "public" },
  { name: "วันแรงงานแห่งชาติ", date: new Date("2025-05-01"), type: "public" },
  { name: "วันฉัตรมงคล", date: new Date("2025-05-04"), type: "public" },
  { name: "วันวิสาขบูชา", date: new Date("2025-05-11"), type: "public" },
  { name: "วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ", date: new Date("2025-06-03"), type: "public" },
  { name: "วันอาสาฬหบูชา", date: new Date("2025-07-10"), type: "public" },
  { name: "วันเข้าพรรษา", date: new Date("2025-07-11"), type: "public" },
  { name: "วันเฉลิมพระชนมพรรษา ร.10", date: new Date("2025-07-28"), type: "public" },
  { name: "วันแม่แห่งชาติ", date: new Date("2025-08-12"), type: "public" },
  { name: "วันคล้ายวันสวรรคต ร.9", date: new Date("2025-10-13"), type: "public" },
  { name: "วันปิยมหาราช", date: new Date("2025-10-23"), type: "public" },
  { name: "วันพ่อแห่งชาติ", date: new Date("2025-12-05"), type: "public" },
  { name: "วันรัฐธรรมนูญ", date: new Date("2025-12-10"), type: "public" },
  { name: "วันสิ้นปี", date: new Date("2025-12-31"), type: "public" },
];

// Default subscription plans
const defaultPlans = [
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

async function seed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected!");

  // Default password for admin: "password123"
  const hashedPassword = await bcrypt.hash("password123", 12);

  console.log("\nCreating super admin user...");

  // Super Admin
  const superAdmin = await User.findOneAndUpdate(
    { email: "superadmin@example.com" },
    {
      name: "Super Admin",
      email: "superadmin@example.com",
      password: hashedPassword,
      role: "super_admin",
    },
    { upsert: true, new: true }
  );
  console.log(`  Super Admin: ${superAdmin.email}`);

  console.log("\nCreating holidays...");

  // Clear existing holidays for 2025
  await Holiday.deleteMany({
    date: {
      $gte: new Date("2025-01-01"),
      $lte: new Date("2025-12-31"),
    },
  });

  // Insert holidays
  for (const holiday of thaiHolidays2025) {
    await Holiday.create(holiday);
    console.log(`  ${holiday.name} (${holiday.date.toISOString().split("T")[0]})`);
  }

  console.log("\nCreating subscription plans...");

  // Clear and insert plans
  await Plan.deleteMany({});
  for (const plan of defaultPlans) {
    await Plan.create(plan);
    console.log(`  ${plan.name} (${plan.slug}) - $${plan.monthlyPrice}/mo`);
  }

  console.log("\n========================================");
  console.log("Seed completed!");
  console.log("========================================");
  console.log("\nSuper Admin password: password123");
  console.log("\nCreated:");
  console.log("  - superadmin@example.com (Super Admin)");
  console.log(`  - ${thaiHolidays2025.length} Thai holidays for 2025`);
  console.log(`  - ${defaultPlans.length} subscription plans`);
  console.log("========================================\n");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
