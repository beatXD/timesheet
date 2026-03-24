import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Timesheet } from "@/models";

// DELETE /api/timesheets/[id]/comments/[commentId] - Delete a comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id, commentId } = await params;

    const timesheet = await Timesheet.findById(id);
    if (!timesheet) {
      return NextResponse.json(
        { error: "Timesheet not found" },
        { status: 404 }
      );
    }

    // Find the comment
    const comment = timesheet.comments?.find(
      (c: { _id: { toString: () => string } }) => c._id.toString() === commentId
    );

    if (!comment) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    // Only comment owner can delete
    if (comment.userId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: "Can only delete your own comments" },
        { status: 403 }
      );
    }

    // Atomic pull to avoid optimistic concurrency conflicts
    await Timesheet.findByIdAndUpdate(id, {
      $pull: {
        comments: { _id: commentId },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
