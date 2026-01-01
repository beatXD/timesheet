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
  role: { type: String, enum: ["admin", "leader", "user"], default: "user" },
  teamIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Team" }],
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
  contractRole: { type: String },
}, { timestamps: true });

// Holiday Schema
const HolidaySchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: Date, required: true },
  type: { type: String, enum: ["public", "company"], default: "public" },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Holiday = mongoose.models.Holiday || mongoose.model("Holiday", HolidaySchema);

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

async function seed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected!");

  // Default password for admin: "password123"
  const hashedPassword = await bcrypt.hash("password123", 12);

  console.log("\nCreating admin user...");

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

  console.log("\n========================================");
  console.log("Seed completed!");
  console.log("========================================");
  console.log("\nAdmin password: password123");
  console.log("\nCreated:");
  console.log("  - admin@example.com (Admin)");
  console.log(`  - ${thaiHolidays2025.length} Thai holidays for 2025`);
  console.log("========================================\n");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
