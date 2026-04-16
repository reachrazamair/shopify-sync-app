import { prisma } from '@repo/db';
import type { SyncStatus } from '@repo/db';

export interface UpdateSyncLogParams {
  orderId?: string | null;
  eventType: string;
  status: SyncStatus;
  errorMessage?: string | null;
  workflowRunId?: string | null;
  activityName?: string | null;
  durationMs?: number | null;
}

export async function updateSyncLog(params: UpdateSyncLogParams): Promise<void> {
  await prisma.syncLog.create({
    data: {
      orderId: params.orderId ?? null,
      eventType: params.eventType,
      status: params.status,
      errorMessage: params.errorMessage ?? null,
      workflowRunId: params.workflowRunId ?? null,
      activityName: params.activityName ?? null,
      durationMs: params.durationMs ?? null,
      completedAt: new Date(),
    },
  });
}
