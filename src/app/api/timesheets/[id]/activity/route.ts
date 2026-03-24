import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ActivityLog } from "@/models";

// GET /api/timesheets/[id]/activity - Get activity logs for a specific timesheet
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;

    const activities = await ActivityLog.find({
      targetId: id,
      targetType: "timesheet",
    })
      .populate("userId", "name email image")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ data: activities });
  } catch (error) {
    console.error("Failed to fetch timesheet activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}
