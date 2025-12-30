import mongoose, { Schema, Model } from "mongoose";

export interface ITemplateEntry {
  dayOfWeek: number; // 0-6 (Sunday = 0)
  type: "working" | "weekend" | "holiday" | "leave";
  task?: string;
  timeIn?: string;
  timeOut?: string;
  baseHours: number;
  additionalHours?: number;
  remark?: string;
}

export interface ITimesheetTemplate {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  entries: ITemplateEntry[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TemplateEntrySchema = new Schema<ITemplateEntry>(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    type: {
      type: String,
      enum: ["working", "weekend", "holiday", "leave"],
      default: "working",
    },
    task: { type: String },
    timeIn: { type: String },
    timeOut: { type: String },
    baseHours: { type: Number, default: 8 },
    additionalHours: { type: Number, default: 0 },
    remark: { type: String },
  },
  { _id: false }
);

const TimesheetTemplateSchema = new Schema<ITimesheetTemplate>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    description: { type: String },
    entries: [TemplateEntrySchema],
    isDefault: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Index for user templates
TimesheetTemplateSchema.index({ userId: 1, name: 1 }, { unique: true });

const TimesheetTemplate: Model<ITimesheetTemplate> =
  mongoose.models.TimesheetTemplate ||
  mongoose.model<ITimesheetTemplate>("TimesheetTemplate", TimesheetTemplateSchema);

export default TimesheetTemplate;
