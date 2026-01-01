import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Team from "@/models/Team";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  checkRateLimit,
  rateLimitConfigs,
  getClientIdentifier,
  createRateLimitHeaders,
} from "@/lib/rate-limit";
import type { SubscriptionPlan } from "@/types";

const registerSchema = z.object({
  name: z.string().min(2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร"),
  email: z.string().email("รูปแบบ Email ไม่ถูกต้อง"),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
  plan: z.enum(["free", "pro", "enterprise"]).default("free"),
  teamName: z.string().optional(),
});

// Subscription plan limits
const planLimits: Record<SubscriptionPlan, { maxUsers: number; maxTeams: number }> = {
  free: { maxUsers: 1, maxTeams: 1 },
  pro: { maxUsers: 5, maxTeams: 1 },
  enterprise: { maxUsers: 100, maxTeams: 10 },
};

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(`register:${clientId}`, rateLimitConfigs.auth);

    if (rateLimit.limited) {
      return NextResponse.json(
        { error: "คำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่" },
        {
          status: 429,
          headers: createRateLimitHeaders(
            rateLimit.remaining,
            rateLimit.resetTime,
            rateLimitConfigs.auth.maxRequests
          ),
        }
      );
    }

    const body = await request.json();

    // Validate input
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, password, plan, teamName } = result.data;

    // Validate team name for Pro plan
    if (plan === "pro" && !teamName?.trim()) {
      return NextResponse.json(
        { error: "Team name is required for Pro plan" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // Check if it's an OAuth account without password
      if (!existingUser.password) {
        // Allow setting password for OAuth account
        const hashedPassword = await bcrypt.hash(password, 12);
        existingUser.password = hashedPassword;
        await existingUser.save();

        return NextResponse.json({
          success: true,
          message: "เพิ่มรหัสผ่านสำหรับบัญชีเรียบร้อยแล้ว",
        });
      }

      return NextResponse.json(
        { error: "Email นี้ถูกใช้งานแล้ว" },
        { status: 400 }
      );
    }

    // Check if team name already exists (for Pro plan)
    if (plan === "pro" && teamName) {
      const existingTeam = await Team.findOne({ name: teamName.trim() });
      if (existingTeam) {
        return NextResponse.json(
          { error: "ชื่อทีมนี้ถูกใช้งานแล้ว กรุณาใช้ชื่ออื่น" },
          { status: 400 }
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Determine role based on plan
    // Free: user role (self-managed)
    // Pro: admin role (team leader)
    const role = plan === "free" ? "user" : "admin";

    // Get plan limits
    const limits = planLimits[plan];

    // Create user with subscription
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      subscription: {
        plan,
        status: "active",
        maxUsers: limits.maxUsers,
        maxTeams: limits.maxTeams,
        // Mock Stripe IDs
        stripeCustomerId: `cus_mock_${Date.now()}`,
        stripeSubscriptionId: plan === "free" ? undefined : `sub_mock_${Date.now()}`,
        currentPeriodEnd: plan === "free" ? undefined : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
    });

    // Create team for Pro plan
    if (plan === "pro" && teamName) {
      const team = await Team.create({
        name: teamName.trim(),
        adminId: user._id,
        memberIds: [],
      });

      // Add team to user's teamIds
      user.teamIds = [team._id];
      await user.save();
    }

    return NextResponse.json({
      success: true,
      message: plan === "pro"
        ? "สร้างบัญชีและทีมสำเร็จ"
        : "สร้างบัญชีสำเร็จ",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.subscription?.plan,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการสร้างบัญชี" },
      { status: 500 }
    );
  }
}
