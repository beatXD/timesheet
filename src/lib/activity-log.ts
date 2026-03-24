import { ActivityLog } from "@/models";
import type { ActivityAction, ActivityTargetType } from "@/types";
import { Types } from "mongoose";

interface LogActivityParams {
  userId: string | Types.ObjectId;
  action: ActivityAction;
  targetType: ActivityTargetType;
  targetId: string | Types.ObjectId;
  metadata?: Record<string, unknown>;
  teamId?: string | Types.ObjectId;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await ActivityLog.create({
      userId: params.userId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      metadata: params.metadata,
      teamId: params.teamId,
    });
  } catch (error) {
    // Fire-and-forget: log error but don't throw
    console.error("Failed to log activity:", error);
  }
}
