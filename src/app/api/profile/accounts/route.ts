import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { ObjectId } from "mongodb";

// DELETE /api/profile/accounts - Unlink an OAuth account
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");

    if (!provider) {
      return NextResponse.json(
        { error: "Provider is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get linked accounts
    const client = (await import("@/lib/mongodb-client")).default;
    const db = (await client).db();
    const accounts = await db
      .collection("accounts")
      .find({ userId: new ObjectId(session.user.id) })
      .toArray();

    // Check if user has at least one other way to login
    const hasPassword = !!user.password;
    const otherAccounts = accounts.filter((acc) => acc.provider !== provider);

    if (!hasPassword && otherAccounts.length === 0) {
      return NextResponse.json(
        { error: "ไม่สามารถยกเลิกการเชื่อมต่อได้ เนื่องจากคุณต้องมีอย่างน้อยหนึ่งวิธีในการเข้าสู่ระบบ กรุณาตั้งรหัสผ่านหรือเชื่อมต่อบัญชีอื่นก่อน" },
        { status: 400 }
      );
    }

    // Delete the account link
    const result = await db.collection("accounts").deleteOne({
      userId: new ObjectId(session.user.id),
      provider: provider,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "ไม่พบบัญชีที่เชื่อมต่อ" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `ยกเลิกการเชื่อมต่อ ${provider} สำเร็จ`,
    });
  } catch (error) {
    console.error("Error unlinking account:", error);
    return NextResponse.json(
      { error: "Failed to unlink account" },
      { status: 500 }
    );
  }
}
