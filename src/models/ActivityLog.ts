import mongoose, { Schema, Model } from "mongoose";
import type { IActivityLog, ActivityAction, ActivityTargetType } from "@/types";

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: {
      type: String,
      enum: [
        "timesheet_created",
        "timesheet_updated",
        "timesheet_submitted",
        "timesheet_approved",
        "timesheet_rejected",
        "comment_added",
        "comment_deleted",
        "leave_requested",
        "leave_approved",
        "leave_rejected",
        "member_added",
        "member_removed",
      ] as ActivityAction[],
      required: true,
    },
    targetType: {
      type: String,
      enum: ["timesheet", "leave_request", "team"] as ActivityTargetType[],
      required: true,
    },
    targetId: { type: Schema.Types.ObjectId, required: true },
    metadata: { type: Schema.Types.Mixed },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// TTL index: auto-delete after 1 year
ActivityLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 365 * 24 * 60 * 60 }
);

// Query indexes
ActivityLogSchema.index({ teamId: 1, createdAt: -1 });
ActivityLogSchema.index({ targetId: 1, targetType: 1, createdAt: -1 });

const ActivityLog: Model<IActivityLog> =
  mongoose.models.ActivityLog ||
  mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);

export default ActivityLog;
