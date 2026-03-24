import mongoose, { Schema, Model } from "mongoose";
import type { ITimesheet, ITimesheetEntry, ITimesheetComment, EntryType, TimesheetStatus, LeaveType } from "@/types";
import { softDeletePlugin } from "@/lib/mongoose-plugins";

const TimesheetCommentSchema = new Schema<ITimesheetComment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true, maxlength: 500 },
    entryDate: { type: Number, min: 1, max: 31 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const TimesheetEntrySchema = new Schema<ITimesheetEntry>(
  {
    date: { type: Number, required: true, min: 1, max: 31 },
    type: {
      type: String,
      enum: ["working", "weekend", "holiday", "leave"] as EntryType[],
      default: "working",
    },
    leaveType: {
      type: String,
      enum: ["sick", "personal", "annual"] as LeaveType[],
    },
    task: { type: String },
    timeIn: { type: String }, // HH:mm format
    timeOut: { type: String }, // HH:mm format
    baseHours: { type: Number, default: 0 },
    additionalHours: { type: Number, default: 0 },
    remark: { type: String },
    leaveRequestId: { type: Schema.Types.ObjectId, ref: "LeaveRequest" },
    leavePending: { type: Boolean, default: false },
  },
  { _id: false }
);

const TimesheetSchema = new Schema<ITimesheet>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    status: {
      type: String,
      enum: ["draft", "submitted", "approved", "rejected"] as TimesheetStatus[],
      default: "draft",
    },
    entries: [TimesheetEntrySchema],
    totalBaseHours: { type: Number, default: 0 },
    totalAdditionalHours: { type: Number, default: 0 },
    submittedAt: { type: Date },
    approvedAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectedReason: { type: String },
    comments: { type: [TimesheetCommentSchema], default: [] },
  },
  {
    timestamps: true,
    optimisticConcurrency: true, // Enable version-based conflict detection
  }
);

// Compound index for unique timesheet per user per month
TimesheetSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

// Performance indexes for common queries
TimesheetSchema.index({ userId: 1, status: 1 }); // For filtering by user and status
TimesheetSchema.index({ status: 1, submittedAt: -1 }); // For leader approval queue
TimesheetSchema.index({ year: 1, month: 1 }); // For monthly reports

// Apply soft delete plugin
TimesheetSchema.plugin(softDeletePlugin);

const Timesheet: Model<ITimesheet> =
  mongoose.models.Timesheet ||
  mongoose.model<ITimesheet>("Timesheet", TimesheetSchema);

export default Timesheet;
