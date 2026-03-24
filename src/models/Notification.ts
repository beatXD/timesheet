import mongoose, { Schema, Model } from "mongoose";
import type { INotification, NotificationType, NotificationCategory } from "@/types";

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: [
        "timesheet_approved",
        "timesheet_rejected",
        "timesheet_pending",
        "leave_approved",
        "leave_rejected",
        "leave_pending",
        "team_leave",
        "system_announcement",
        "holiday_added",
        "deadline_reminder",
      ] as NotificationType[],
      required: true,
    },
    category: {
      type: String,
      enum: ["approval", "team", "system"] as NotificationCategory[],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String },
    read: { type: Boolean, default: false, index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound index for efficient queries
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

// Auto-delete old notifications after 30 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;
