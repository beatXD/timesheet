import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models";
import { parsePaginationParams, createPaginationMeta } from "@/lib/pagination";

// GET /api/admin/users - List all users (admin and leader can read)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["super_admin", "admin"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    // Parse pagination params
    const { page, limit, skip } = parsePaginationParams(request);

    // Get total count
    const total = await User.countDocuments();

    const users = await User.find()
      .populate("teamIds", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      data: users,
      pagination: createPaginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users - Update user
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { _id, role } = body;

    if (!_id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Check if admin is trying to change their own role
    if (_id === session.user.id && role !== "super_admin") {
      return NextResponse.json(
        { error: "You cannot change your own admin role" },
        { status: 400 }
      );
    }

    const user = await User.findByIdAndUpdate(
      _id,
      { role },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
