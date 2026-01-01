import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Plan } from "@/models";

// GET /api/plans - Get all active plans (public endpoint)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    // If slug is provided, return single plan
    if (slug) {
      const plan = await Plan.findOne({ slug, isActive: true }).lean();
      if (!plan) {
        return NextResponse.json({ error: "Plan not found" }, { status: 404 });
      }
      return NextResponse.json({ data: plan });
    }

    // Return all active plans sorted by sortOrder
    const plans = await Plan.find({ isActive: true })
      .sort({ sortOrder: 1 })
      .lean();

    return NextResponse.json({ data: plans });
  } catch (error) {
    console.error("Get plans error:", error);
    return NextResponse.json(
      { error: "Failed to get plans" },
      { status: 500 }
    );
  }
}
