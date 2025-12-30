import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().min(2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร").optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร").optional(),
});

// GET /api/profile - Get current user profile with linked accounts
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(session.user.id).lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get linked accounts from MongoDB
    const client = (await import("@/lib/mongodb-client")).default;
    const db = (await client).db();
    const accounts = await db
      .collection("accounts")
      .find({ userId: user._id })
      .toArray();

    const linkedAccounts = accounts.map((acc) => ({
      provider: acc.provider,
      providerAccountId: acc.providerAccountId,
    }));

    return NextResponse.json({
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        hasPassword: !!user.password,
        linkedAccounts,
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

// PUT /api/profile - Update profile
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = updateProfileSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, currentPassword, newPassword } = result.data;

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update name if provided
    if (name) {
      user.name = name;
    }

    // Update password if provided
    if (newPassword) {
      // If user has existing password, verify current password
      if (user.password) {
        if (!currentPassword) {
          return NextResponse.json(
            { error: "กรุณากรอกรหัสผ่านปัจจุบัน" },
            { status: 400 }
          );
        }

        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
          return NextResponse.json(
            { error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" },
            { status: 400 }
          );
        }
      }

      user.password = await bcrypt.hash(newPassword, 12);
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: "อัพเดทข้อมูลสำเร็จ",
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
