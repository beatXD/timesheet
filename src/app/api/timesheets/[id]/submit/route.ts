import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Timesheet, Team, User, AuditLog } from "@/models";
import { validateForSubmission } from "@/lib/validation/timesheet";
import { notifyPendingApproval } from "@/lib/notifications";

// POST /api/timesheets/[id]/submit - Submit timesheet for approval
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

    const timesheet = await Timesheet.findById(id);

    if (!timesheet) {
      return NextResponse.json(
        { error: "Timesheet not found" },
        { status: 404 }
      );
    }

    // Only owner can submit
    if (timesheet.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Can only submit draft or rejected timesheets
    if (timesheet.status !== "draft" && timesheet.status !== "rejected") {
      return NextResponse.json(
        { error: "Can only submit draft or rejected timesheets" },
        { status: 400 }
      );
    }

    // Validate timesheet entries
    const validationResult = validateForSubmission(timesheet.entries, {
      month: timesheet.month,
      year: timesheet.year,
    });

    if (!validationResult.valid) {
      return NextResponse.json(
        {
          error: "Timesheet validation failed",
          validationErrors: validationResult.errors,
        },
        { status: 400 }
      );
    }

    const previousStatus = timesheet.status;
    const isLeader = session.user.role === "leader";

    // Leader's own timesheet gets auto-approved
    if (isLeader) {
      timesheet.status = "approved";
      timesheet.submittedAt = new Date();
      timesheet.approvedAt = new Date();
      timesheet.approvedBy = session.user.id as any;
    } else {
      timesheet.status = "submitted";
      timesheet.submittedAt = new Date();
    }
    timesheet.rejectedReason = undefined;

    await timesheet.save();

    // Log the submission/approval
    await AuditLog.logAction({
      entityType: "timesheet",
      entityId: timesheet._id,
      action: isLeader ? "auto_approve" : "submit",
      fromStatus: previousStatus,
      toStatus: timesheet.status,
      performedBy: session.user.id,
    });

    // Notify leaders if regular user submits timesheet
    if (!isLeader) {
      try {
        const teams = await Team.find({ memberIds: session.user.id });
        const leaderIds = teams
          .map((t) => t.leaderId?.toString())
          .filter((id): id is string => !!id);

        if (leaderIds.length > 0) {
          const currentUser = await User.findById(session.user.id).lean();
          await notifyPendingApproval(
            leaderIds,
            currentUser?.name || session.user.name || "User",
            "timesheet"
          );
        }
      } catch (notifyError) {
        console.error("Failed to send notification:", notifyError);
      }
    }

    return NextResponse.json({
      data: timesheet,
      warnings: validationResult.warnings.length > 0 ? validationResult.warnings : undefined,
    });
  } catch (error) {
    console.error("Error submitting timesheet:", error);
    return NextResponse.json(
      { error: "Failed to submit timesheet" },
      { status: 500 }
    );
  }
}
