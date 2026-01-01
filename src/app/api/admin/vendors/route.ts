import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Vendor, User } from "@/models";

// GET /api/admin/vendors - List all vendors
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const vendors = await Vendor.find().sort({ createdAt: -1 }).lean();

    return NextResponse.json({ data: vendors });
  } catch (error) {
    console.error("Error fetching vendors:", error);
    return NextResponse.json(
      { error: "Failed to fetch vendors" },
      { status: 500 }
    );
  }
}

// POST /api/admin/vendors - Create vendor
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { name, contractNo } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const vendor = await Vendor.create({ name, contractNo });

    return NextResponse.json({ data: vendor }, { status: 201 });
  } catch (error) {
    console.error("Error creating vendor:", error);
    return NextResponse.json(
      { error: "Failed to create vendor" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/vendors - Update vendor
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { _id, name, contractNo } = body;

    if (!_id) {
      return NextResponse.json(
        { error: "Vendor ID is required" },
        { status: 400 }
      );
    }

    const vendor = await Vendor.findByIdAndUpdate(
      _id,
      { name, contractNo },
      { new: true }
    );

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json({ data: vendor });
  } catch (error) {
    console.error("Error updating vendor:", error);
    return NextResponse.json(
      { error: "Failed to update vendor" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/vendors - Delete vendor
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Vendor ID is required" },
        { status: 400 }
      );
    }

    // Check if vendor is assigned to any users
    const usersWithVendor = await User.countDocuments({ vendorId: id });
    if (usersWithVendor > 0) {
      return NextResponse.json(
        { error: `Cannot delete vendor. It is assigned to ${usersWithVendor} user(s).` },
        { status: 400 }
      );
    }

    await Vendor.findByIdAndDelete(id);

    return NextResponse.json({ message: "Vendor deleted" });
  } catch (error) {
    console.error("Error deleting vendor:", error);
    return NextResponse.json(
      { error: "Failed to delete vendor" },
      { status: 500 }
    );
  }
}
