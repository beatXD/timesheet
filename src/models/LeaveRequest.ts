import mongoose, { Schema, Model } from "mongoose";
import type { ILeaveRequest, LeaveType, LeaveRequestStatus } from "@/types";

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
    // Balance tracking fields
    daysRequested: { type: Number },
    daysApproved: { type: Number },
    exceedsBalance: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
LeaveRequestSchema.index({ userId: 1, status: 1 });
LeaveRequestSchema.index({ startDate: 1, endDate: 1 });

const LeaveRequest: Model<ILeaveRequest> =
  mongoose.models.LeaveRequest ||
  mongoose.model<ILeaveRequest>("LeaveRequest", LeaveRequestSchema);

export default LeaveRequest;
