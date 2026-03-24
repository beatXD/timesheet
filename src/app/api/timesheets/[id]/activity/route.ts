import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ActivityLog, Timesheet, Team } from "@/models";

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

    const timesheet = await Timesheet.findById(id).lean();
    if (!timesheet) {
      return NextResponse.json(
        { error: "Timesheet not found" },
        { status: 404 }
      );
    }

    const isOwner = timesheet.userId.toString() === session.user.id;
    let hasAccess = isOwner || session.user.role === "super_admin";

    if (!hasAccess && session.user.role === "admin") {
      const teams = await Team.find({ adminId: session.user.id }).lean();
      const allMemberIds = teams.flatMap((t) =>
        t.memberIds.map((id: { toString: () => string }) => id.toString())
      );
      hasAccess = allMemberIds.includes(timesheet.userId.toString());
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const activities = await ActivityLog.find({
      targetId: id,
      targetType: "timesheet",
    })
      .populate("userId", "name email image")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ data: activities });
  } catch (error) {
    console.error("Error fetching timesheet activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch timesheet activity" },
      { status: 500 }
    );
  }
}
