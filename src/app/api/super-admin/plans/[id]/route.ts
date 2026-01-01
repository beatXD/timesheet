import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Plan } from "@/models";
import { Permissions } from "@/lib/permissions";

// GET /api/super-admin/plans/[id] - Get a single plan
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!Permissions.canAccessSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;

    const plan = await Plan.findById(id).lean();
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json({ data: plan });
  } catch (error) {
    console.error("Get plan error:", error);
    return NextResponse.json(
      { error: "Failed to get plan" },
      { status: 500 }
    );
  }
}

// PUT /api/super-admin/plans/[id] - Update a plan
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    await connectDB();
    const { id } = await params;

    const plan = await Plan.findById(id);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Check if slug is being changed and if it conflicts
    if (slug && slug.toLowerCase() !== plan.slug) {
      const existingPlan = await Plan.findOne({ slug: slug.toLowerCase() });
      if (existingPlan) {
        return NextResponse.json(
          { error: "A plan with this slug already exists" },
          { status: 400 }
        );
      }
      plan.slug = slug.toLowerCase();
    }

    // Update fields
    if (name !== undefined) plan.name = name;
    if (description !== undefined) plan.description = description;
    if (monthlyPrice !== undefined) plan.monthlyPrice = monthlyPrice;
    if (maxUsers !== undefined) plan.maxUsers = maxUsers;
    if (maxTeams !== undefined) plan.maxTeams = maxTeams;
    if (features !== undefined) plan.features = features;
    if (isActive !== undefined) plan.isActive = isActive;
    if (sortOrder !== undefined) plan.sortOrder = sortOrder;
    if (stripePriceId !== undefined) plan.stripePriceId = stripePriceId;

    await plan.save();

    return NextResponse.json({ data: plan });
  } catch (error) {
    console.error("Update plan error:", error);
    return NextResponse.json(
      { error: "Failed to update plan" },
      { status: 500 }
    );
  }
}

// DELETE /api/super-admin/plans/[id] - Delete a plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!Permissions.canAccessSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;

    const plan = await Plan.findById(id);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Don't allow deleting if it's the last active plan
    const activePlansCount = await Plan.countDocuments({ isActive: true });
    if (plan.isActive && activePlansCount <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last active plan" },
        { status: 400 }
      );
    }

    await Plan.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete plan error:", error);
    return NextResponse.json(
      { error: "Failed to delete plan" },
      { status: 500 }
    );
  }
}
