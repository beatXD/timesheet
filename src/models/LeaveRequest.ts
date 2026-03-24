import mongoose, { Schema, Model } from "mongoose";
import type { ILeaveRequest, LeaveType, LeaveRequestStatus, LeaveRequestSource } from "@/types";
import { softDeletePlugin } from "@/lib/mongoose-plugins";

const LeaveRequestSchema = new Schema<ILeaveRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    leaveType: {
      type: String,
      enum: ["sick", "personal", "annual"] as LeaveType[],
      required: true,
    },
    reason: { type: String },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"] as LeaveRequestStatus[],
      default: "pending",
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    rejectionReason: { type: String },
    source: {
      type: String,
      enum: ["leave_form", "timesheet"] as LeaveRequestSource[],
      default: "leave_form",
    },
    // Balance tracking fields
    daysRequested: { type: Number },
    daysApproved: { type: Number },
    exceedsBalance: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    optimisticConcurrency: true, // Enable version-based conflict detection
  }
);

// Index for efficient querying
LeaveRequestSchema.index({ userId: 1, status: 1 });
LeaveRequestSchema.index({ startDate: 1, endDate: 1 });

// Apply soft delete plugin
LeaveRequestSchema.plugin(softDeletePlugin);

const LeaveRequest: Model<ILeaveRequest> =
  mongoose.models.LeaveRequest ||
  mongoose.model<ILeaveRequest>("LeaveRequest", LeaveRequestSchema);

export default LeaveRequest;
