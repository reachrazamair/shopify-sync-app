import { proxyActivities, workflowInfo, ApplicationFailure } from '@temporalio/workflow';
import type { ValidatedOrder, EnrichedOrder, TransformedOrder, UpdateSyncLogParams } from '../activities/index.js';

// Explicit activity interface avoids Symbol property conflicts from module namespace
interface Activities {
  validateOrder(rawPayload: unknown): Promise<ValidatedOrder>;
  enrichOrder(order: ValidatedOrder): Promise<EnrichedOrder>;
  transformOrder(order: EnrichedOrder): Promise<TransformedOrder>;
  storeOrder(order: TransformedOrder): Promise<string>;
  updateSyncLog(params: UpdateSyncLogParams): Promise<void>;
}

const {
  validateOrder,
  enrichOrder,
  transformOrder,
  storeOrder,
  updateSyncLog,
} = proxyActivities<Activities>({
  startToCloseTimeout: '30 seconds',
  retry: {
    maximumAttempts: 3,
    initialInterval: '1 second',
    backoffCoefficient: 2,
    maximumInterval: '10 seconds',
    nonRetryableErrorTypes: ['ValidationError'],
  },
});

export async function orderSyncWorkflow(rawPayload: unknown): Promise<void> {
  const { runId } = workflowInfo();
  let orderId: string | null = null;

  // Log workflow start
  await updateSyncLog({
    eventType: 'workflow_started',
    status: 'PENDING',
    workflowRunId: runId,
  });

  // Step 1: Validate — non-retryable on ValidationError
  let validated: ValidatedOrder;
  try {
    validated = await validateOrder(rawPayload);
  } catch (err) {
    await updateSyncLog({
      eventType: 'validateOrder',
      status: 'FAILURE',
      activityName: 'validateOrder',
      workflowRunId: runId,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  await updateSyncLog({
    eventType: 'validateOrder',
    status: 'SUCCESS',
    activityName: 'validateOrder',
    workflowRunId: runId,
  });

  // Step 2: Enrich — retryable (network/API failures)
  let enriched: EnrichedOrder;
  try {
    enriched = await enrichOrder(validated);
  } catch (err) {
    await updateSyncLog({
      eventType: 'enrichOrder',
      status: 'FAILURE',
      activityName: 'enrichOrder',
      workflowRunId: runId,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    // Compensation: enrichment is read-only, nothing to undo
    throw ApplicationFailure.retryable(
      `enrichOrder failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  await updateSyncLog({
    eventType: 'enrichOrder',
    status: 'SUCCESS',
    activityName: 'enrichOrder',
    workflowRunId: runId,
  });

  // Step 3: Transform
  let transformed: TransformedOrder;
  try {
    transformed = await transformOrder(enriched);
  } catch (err) {
    await updateSyncLog({
      eventType: 'transformOrder',
      status: 'FAILURE',
      activityName: 'transformOrder',
      workflowRunId: runId,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  await updateSyncLog({
    eventType: 'transformOrder',
    status: 'SUCCESS',
    activityName: 'transformOrder',
    workflowRunId: runId,
  });

  // Step 4: Store — uses upsert so it's safe to retry
  try {
    orderId = await storeOrder(transformed);
  } catch (err) {
    await updateSyncLog({
      eventType: 'storeOrder',
      status: 'FAILURE',
      activityName: 'storeOrder',
      workflowRunId: runId,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  await updateSyncLog({
    orderId,
    eventType: 'storeOrder',
    status: 'SUCCESS',
    activityName: 'storeOrder',
    workflowRunId: runId,
  });

  // Step 5: Final log
  await updateSyncLog({
    orderId,
    eventType: 'workflow_completed',
    status: 'SUCCESS',
    workflowRunId: runId,
  });
}
