import mongoose, { Schema, Document, Types } from "mongoose";

export type ActivityAction =
  | "timesheet_created"
  | "timesheet_updated"
  | "timesheet_submitted"
  | "timesheet_approved"
  | "timesheet_rejected"
  | "timesheet_comment"
  | "leave_requested"
  | "leave_approved"
  | "leave_rejected"
  | "member_added"
  | "member_removed";

export type ActivityTargetType = "timesheet" | "leave_request" | "team" | "user";

export interface IActivityLog extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  action: ActivityAction;
  targetType: ActivityTargetType;
  targetId: Types.ObjectId;
  teamId?: Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "timesheet_created",
        "timesheet_updated",
        "timesheet_submitted",
        "timesheet_approved",
        "timesheet_rejected",
        "timesheet_comment",
        "leave_requested",
        "leave_approved",
        "leave_rejected",
        "member_added",
        "member_removed",
      ],
      index: true,
    },
    targetType: {
      type: String,
      required: true,
      enum: ["timesheet", "leave_request", "team", "user"],
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
ActivityLogSchema.index({ teamId: 1, createdAt: -1 });
ActivityLogSchema.index({ targetId: 1, targetType: 1, createdAt: -1 });

export default mongoose.models.ActivityLog ||
  mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);
