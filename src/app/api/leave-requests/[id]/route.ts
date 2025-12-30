import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { LeaveRequest, Team, Timesheet } from "@/models";
import type { LeaveType } from "@/types";

// GET /api/leave-requests/[id] - Get a specific leave request
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

    const leaveRequest = await LeaveRequest.findById(id)
      .populate("userId", "name email image")
      .populate("reviewedBy", "name email")
      .lean();

    if (!leaveRequest) {
      return NextResponse.json(
        { error: "Leave request not found" },
        { status: 404 }
      );
    }

    // Check access
    const isOwner = leaveRequest.userId._id.toString() === session.user.id;
    const isAdmin = session.user.role === "admin";

    if (!isOwner && !isAdmin) {
      // Check if leader of user's team
      if (session.user.role === "leader") {
        const teams = await Team.find({ leaderId: session.user.id });
        const allMemberIds = teams.flatMap((t) =>
          t.memberIds.map((mid: { toString: () => string }) => mid.toString())
        );
        if (!allMemberIds.includes(leaveRequest.userId._id.toString())) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({
      data: {
        ...leaveRequest,
        _id: leaveRequest._id.toString(),
      },
    });
  } catch (error) {
    console.error("Error fetching leave request:", error);
    return NextResponse.json(
      { error: "Failed to fetch leave request" },
      { status: 500 }
    );
  }
}

// DELETE /api/leave-requests/[id] - Cancel a pending leave request
export async function DELETE(
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

    const leaveRequest = await LeaveRequest.findById(id);

    if (!leaveRequest) {
      return NextResponse.json(
        { error: "Leave request not found" },
        { status: 404 }
      );
    }

    // Only owner or admin can delete
    if (
      leaveRequest.userId.toString() !== session.user.id &&
      session.user.role !== "admin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Can only cancel pending requests
    if (leaveRequest.status !== "pending") {
      return NextResponse.json(
        { error: "Can only cancel pending requests" },
        { status: 400 }
      );
    }

    await LeaveRequest.findByIdAndDelete(id);

    return NextResponse.json({ message: "Leave request cancelled" });
  } catch (error) {
    console.error("Error cancelling leave request:", error);
    return NextResponse.json(
      { error: "Failed to cancel leave request" },
      { status: 500 }
    );
  }
}

// POST /api/leave-requests/[id] - Approve or reject (action in body)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only leaders and admins can approve/reject
    if (session.user.role === "user") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { action, rejectionReason } = body;

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    const leaveRequest = await LeaveRequest.findById(id);

    if (!leaveRequest) {
      return NextResponse.json(
        { error: "Leave request not found" },
        { status: 404 }
      );
    }

    // Check if leader has authority over this user
    if (session.user.role === "leader") {
      const teams = await Team.find({ leaderId: session.user.id });
      const allMemberIds = teams.flatMap((t) =>
        t.memberIds.map((mid: { toString: () => string }) => mid.toString())
      );
      if (!allMemberIds.includes(leaveRequest.userId.toString())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Can only process pending requests
    if (leaveRequest.status !== "pending") {
      return NextResponse.json(
        { error: "Can only process pending requests" },
        { status: 400 }
      );
    }

    if (action === "approve") {
      // Update leave request status
      leaveRequest.status = "approved";
      leaveRequest.reviewedBy = session.user.id as any;
      leaveRequest.reviewedAt = new Date();
      await leaveRequest.save();

      // Auto-add to timesheet
      await addLeaveToTimesheet(leaveRequest);

      return NextResponse.json({
        message: "Leave request approved",
        data: leaveRequest,
      });
    } else {
      // Reject
      if (!rejectionReason) {
        return NextResponse.json(
          { error: "Rejection reason is required" },
          { status: 400 }
        );
      }

      leaveRequest.status = "rejected";
      leaveRequest.reviewedBy = session.user.id as any;
      leaveRequest.reviewedAt = new Date();
      leaveRequest.rejectionReason = rejectionReason;
      await leaveRequest.save();

      return NextResponse.json({
        message: "Leave request rejected",
        data: leaveRequest,
      });
    }
  } catch (error) {
    console.error("Error processing leave request:", error);
    return NextResponse.json(
      { error: "Failed to process leave request" },
      { status: 500 }
    );
  }
}

// Helper function to add leave entries to timesheet
async function addLeaveToTimesheet(leaveRequest: {
  userId: { toString: () => string };
  startDate: Date;
  endDate: Date;
  leaveType: string;
  reason?: string;
}) {
  const startDate = new Date(leaveRequest.startDate);
  const endDate = new Date(leaveRequest.endDate);

  // Loop through each day in the range
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const month = currentDate.getMonth() + 1; // 1-12
    const year = currentDate.getFullYear();
    const day = currentDate.getDate();

    // Skip weekends
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // Find or create timesheet for this month using findOneAndUpdate with upsert
    // This prevents race conditions when approving multiple requests simultaneously
    const timesheet = await Timesheet.findOneAndUpdate(
      {
        userId: leaveRequest.userId.toString(),
        month,
        year,
      },
      {
        $setOnInsert: {
          status: "draft",
          entries: [],
          totalBaseHours: 0,
          totalAdditionalHours: 0,
        },
      },
      { upsert: true, new: true }
    );

    // Check if timesheet is already submitted/approved - skip adding leave entry
    if (
      ["approved", "final_approved", "team_submitted"].includes(
        timesheet.status
      )
    ) {
      console.warn(
        `Timesheet ${timesheet._id} already submitted/approved, skipping auto-add leave for day ${day}`
      );
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // Check if entry for this day already exists
    const existingEntryIndex = timesheet.entries.findIndex(
      (e: { date: number }) => e.date === day
    );

    const leaveEntry = {
      date: day,
      type: "leave" as const,
      leaveType: leaveRequest.leaveType as LeaveType,
      task: "",
      timeIn: "",
      timeOut: "",
      baseHours: 8, // Standard work day
      additionalHours: 0,
      remark: leaveRequest.reason || "",
    };

    if (existingEntryIndex >= 0) {
      // Update existing entry
      timesheet.entries[existingEntryIndex] = leaveEntry;
    } else {
      // Add new entry
      timesheet.entries.push(leaveEntry);
    }

    // Recalculate totals
    timesheet.totalBaseHours = timesheet.entries.reduce(
      (sum: number, e: { baseHours?: number }) => sum + (e.baseHours || 0),
      0
    );
    timesheet.totalAdditionalHours = timesheet.entries.reduce(
      (sum: number, e: { additionalHours?: number }) =>
        sum + (e.additionalHours || 0),
      0
    );

    await timesheet.save();

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
}
