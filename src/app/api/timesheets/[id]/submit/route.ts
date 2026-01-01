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
    const user = await User.findById(session.user.id);

    // Determine if this is a Free plan user (auto-approve) or Pro/Enterprise (needs approval)
    // Free plan users: Auto-approve their own timesheets
    // Pro/Enterprise team members: Submit for admin approval
    // Admins: Auto-approve their own timesheets
    let shouldAutoApprove = false;

    // Check if user is an admin (team leader) - they auto-approve their own timesheets
    if (session.user.role === "admin") {
      shouldAutoApprove = true;
    } else if (user?.subscription?.plan === "free") {
      // Free plan users auto-approve (self-managed)
      shouldAutoApprove = true;
    } else {
      // Regular users in Pro/Enterprise teams need approval
      shouldAutoApprove = false;
    }

    if (shouldAutoApprove) {
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
      action: shouldAutoApprove ? "auto_approve" : "submit",
      fromStatus: previousStatus,
      toStatus: timesheet.status,
      performedBy: session.user.id,
    });

    // Notify leaders if regular user submits timesheet (needs approval)
    if (!shouldAutoApprove) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const teams: any[] = await Team.find({ memberIds: session.user.id });
        const adminIds = teams
          .map((t) => t.adminId?.toString())
          .filter((id): id is string => !!id);

        if (adminIds.length > 0) {
          const currentUser = await User.findById(session.user.id).lean();
          await notifyPendingApproval(
            adminIds,
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
