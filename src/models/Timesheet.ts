import mongoose, { Schema, Model } from "mongoose";
import type { ITimesheet, ITimesheetEntry, EntryType, TimesheetStatus, LeaveType } from "@/types";

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
  },
  {
    timestamps: true,
  }
);

// Compound index for unique timesheet per user per month
TimesheetSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

const Timesheet: Model<ITimesheet> =
  mongoose.models.Timesheet ||
  mongoose.model<ITimesheet>("Timesheet", TimesheetSchema);

export default Timesheet;
