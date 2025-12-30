import mongoose, { Schema, Document } from "mongoose";

export type AuditEntityType = "timesheet" | "leave_request";
export type AuditAction = "create" | "submit" | "approve" | "reject" | "cancel" | "team_submit" | "final_approve";

export interface IAuditLog extends Document {
  entityType: AuditEntityType;
  entityId: mongoose.Types.ObjectId;
  action: AuditAction;
  fromStatus?: string;
  toStatus: string;
  performedBy: mongoose.Types.ObjectId;
  reason?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    entityType: {
      type: String,
      required: true,
      enum: ["timesheet", "leave_request"],
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: ["create", "submit", "approve", "reject", "cancel", "team_submit", "final_approve"],
    },
    fromStatus: {
      type: String,
    },
    toStatus: {
      type: String,
      required: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying by entity
AuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

// Index for querying by user
AuditLogSchema.index({ performedBy: 1, createdAt: -1 });

// Static method to log an action
AuditLogSchema.statics.logAction = async function (params: {
  entityType: AuditEntityType;
  entityId: mongoose.Types.ObjectId | string;
  action: AuditAction;
  fromStatus?: string;
  toStatus: string;
  performedBy: mongoose.Types.ObjectId | string;
  reason?: string;
  metadata?: Record<string, unknown>;
}) {
  return this.create({
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    fromStatus: params.fromStatus,
    toStatus: params.toStatus,
    performedBy: params.performedBy,
    reason: params.reason,
    metadata: params.metadata,
  });
};

// Static method to get history for an entity
AuditLogSchema.statics.getHistory = async function (
  entityType: AuditEntityType,
  entityId: mongoose.Types.ObjectId | string
) {
  return this.find({ entityType, entityId })
    .populate("performedBy", "name email image")
    .sort({ createdAt: -1 });
};

export interface IAuditLogModel extends mongoose.Model<IAuditLog> {
  logAction(params: {
    entityType: AuditEntityType;
    entityId: mongoose.Types.ObjectId | string;
    action: AuditAction;
    fromStatus?: string;
    toStatus: string;
    performedBy: mongoose.Types.ObjectId | string;
    reason?: string;
    metadata?: Record<string, unknown>;
  }): Promise<IAuditLog>;
  getHistory(
    entityType: AuditEntityType,
    entityId: mongoose.Types.ObjectId | string
  ): Promise<IAuditLog[]>;
}

const AuditLog: IAuditLogModel =
  (mongoose.models.AuditLog as IAuditLogModel) ||
  mongoose.model<IAuditLog, IAuditLogModel>("AuditLog", AuditLogSchema);

export default AuditLog;
