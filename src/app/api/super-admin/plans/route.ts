import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Plan } from "@/models";
import { Permissions } from "@/lib/permissions";

// GET /api/super-admin/plans - List all plans
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!Permissions.canAccessSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const plans = await Plan.find().sort({ sortOrder: 1, createdAt: 1 }).lean();

    return NextResponse.json({ data: plans });
  } catch (error) {
    console.error("Get plans error:", error);
    return NextResponse.json(
      { error: "Failed to get plans" },
      { status: 500 }
    );
  }
}

// POST /api/super-admin/plans - Create a new plan
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!Permissions.canAccessSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      slug,
      name,
      description,
      monthlyPrice,
      maxUsers,
      maxTeams,
      features,
      isActive,
      sortOrder,
      stripePriceId,
    } = body;

    if (!slug || !name) {
      return NextResponse.json(
        { error: "Slug and name are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if slug already exists
    const existingPlan = await Plan.findOne({ slug: slug.toLowerCase() });
    if (existingPlan) {
      return NextResponse.json(
        { error: "A plan with this slug already exists" },
        { status: 400 }
      );
    }

    const plan = await Plan.create({
      slug: slug.toLowerCase(),
      name,
      description,
      monthlyPrice: monthlyPrice || 0,
      maxUsers: maxUsers || 1,
      maxTeams: maxTeams || 1,
      features: features || [],
      isActive: isActive !== false,
      sortOrder: sortOrder || 0,
      stripePriceId,
    });

    return NextResponse.json({ data: plan }, { status: 201 });
  } catch (error) {
    console.error("Create plan error:", error);
    return NextResponse.json(
      { error: "Failed to create plan" },
      { status: 500 }
    );
  }
}
