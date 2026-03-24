import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Timesheet, Team } from "@/models";
import { timesheetCommentSchema } from "@/lib/validation/schemas";
import { createNotification } from "@/lib/notifications";

// POST /api/timesheets/[id]/comments - Add a comment to a timesheet
export async function POST(
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

    const body = await request.json();
    const validation = timesheetCommentSchema.safeParse(body);

    if (!validation.success) {
      const issues = validation.error.issues || [];
      const firstIssue = issues[0];
      return NextResponse.json(
        { error: firstIssue?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const { message, entryDate } = validation.data;

    const timesheet = await Timesheet.findById(id);
    if (!timesheet) {
      return NextResponse.json(
        { error: "Timesheet not found" },
        { status: 404 }
      );
    }

    // Permission check: owner, team admin, or super_admin
    const isOwner = timesheet.userId.toString() === session.user.id;
    const isSuperAdmin = session.user.role === "super_admin";

    let isTeamAdmin = false;
    if (!isOwner && !isSuperAdmin) {
      const team = await Team.findOne({
        adminId: session.user.id,
        memberIds: timesheet.userId,
      });
      isTeamAdmin = !!team;
    }

    if (!isOwner && !isTeamAdmin && !isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check max 100 comments
    if (timesheet.comments && timesheet.comments.length >= 100) {
      return NextResponse.json(
        { error: "Maximum comments reached" },
        { status: 400 }
      );
    }

    // Atomic push to avoid optimistic concurrency conflicts
    const updated = await Timesheet.findByIdAndUpdate(
      id,
      {
        $push: {
          comments: {
            userId: session.user.id,
            message,
            entryDate,
          },
        },
      },
      { new: true }
    ).populate("comments.userId", "name email image");

    // Notify the other party
    try {
      if (isOwner) {
        // Owner commented → notify team admin
        const team = await Team.findOne({ memberIds: timesheet.userId });
        if (team) {
          await createNotification({
            userId: team.adminId,
            type: "timesheet_pending",
            title: "New comment on timesheet",
            message: `${session.user.name} commented on their timesheet`,
            link: `/team`,
            metadata: { timesheetId: id },
          });
        }
      } else {
        // Admin/super_admin commented → notify timesheet owner
        await createNotification({
          userId: timesheet.userId,
          type: "timesheet_pending",
          title: "New comment on your timesheet",
          message: `${session.user.name} commented on your timesheet`,
          link: `/timesheet/${id}`,
          metadata: { timesheetId: id },
        });
      }
    } catch (notifError) {
      console.error("Failed to send comment notification:", notifError);
    }

    return NextResponse.json({ data: updated?.comments || [] });
  } catch (error) {
    console.error("Error adding comment:", error);
    return NextResponse.json(
      { error: "Failed to add comment" },
      { status: 500 }
    );
  }
}
