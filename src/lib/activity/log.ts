"use server";

import { db } from "@/lib/db";

export type ActivityAction =
  | "document.uploaded"
  | "document.visibility_changed"
  | "document.deleted"
  | "assignment.suggested"
  | "assignment.activated"
  | "assignment.rejected"
  | "invitation.sent"
  | "invitation.accepted"
  | "portal.login"
  | "lesson.started"
  | "lesson.completed"
  | "blueprint.result_released";

export async function logActivity(params: {
  companyId: string;
  userId?: string | null;
  action: ActivityAction;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.activityLog.create({
      data: {
        companyId: params.companyId,
        userId: params.userId ?? null,
        action: params.action,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        metadata: JSON.stringify(params.metadata ?? {}),
      },
    });
  } catch {
    // Activity log failures must never crash the main operation
  }
}
