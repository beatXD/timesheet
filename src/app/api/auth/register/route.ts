import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร"),
  email: z.string().email("รูปแบบ Email ไม่ถูกต้อง"),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, password } = result.data;

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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "user",
    });

    return NextResponse.json({
      success: true,
      message: "สร้างบัญชีสำเร็จ",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
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
