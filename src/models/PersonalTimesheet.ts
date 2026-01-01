import mongoose, { Schema, Model } from "mongoose";
import type { IPersonalTimesheet, ITimesheetEntry, EntryType, LeaveType } from "@/types";
import { softDeletePlugin } from "@/lib/mongoose-plugins";

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
    timeIn: { type: String },
    timeOut: { type: String },
    baseHours: { type: Number, default: 0 },
    additionalHours: { type: Number, default: 0 },
    remark: { type: String },
  },
  { _id: false }
);

const PersonalTimesheetSchema = new Schema<IPersonalTimesheet>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    entries: [TimesheetEntrySchema],
    totalBaseHours: { type: Number, default: 0 },
    totalAdditionalHours: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique personal timesheet per user per month
PersonalTimesheetSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

// Performance indexes
PersonalTimesheetSchema.index({ userId: 1, year: 1 });
PersonalTimesheetSchema.index({ year: 1, month: 1 });

// Apply soft delete plugin
PersonalTimesheetSchema.plugin(softDeletePlugin);

const PersonalTimesheet: Model<IPersonalTimesheet> =
  mongoose.models.PersonalTimesheet ||
  mongoose.model<IPersonalTimesheet>("PersonalTimesheet", PersonalTimesheetSchema);

export default PersonalTimesheet;
