// lib/temporal/workflows/omegaSignal.workflow.ts
// Durable workflow for processing Omega signals

import { proxyActivities, sleep } from "@temporalio/workflow";
import type * as activities from "../activities";

// Proxy all activities with retry configuration
const {
  runOmegaGraphActivity,
  persistOmegaActivity,
  executeDraftActivity,
  queueForReviewActivity,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "2 minutes",
  retry: {
    maximumAttempts: 5,
    initialInterval: "2s",
    backoffCoefficient: 2,
    maximumInterval: "1 minute",
  },
});

export interface OmegaWorkflowInput {
  signal: {
    id: string;
    userId: string;
    source: string;
    signalType: string;
    payload: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    createdAt: string;
  };
  userId: string;
  userContext: Record<string, unknown>;
}

export interface OmegaWorkflowResult {
  sessionId: string;
  executed: boolean;
  queued: boolean;
  execution?: {
    action?: string;
    status: string;
    executedAt?: string;
  };
  errors?: string[];
}

/**
 * Omega Signal Workflow
 *
 * This is the main durable workflow for processing signals:
 * 1. Runs LangGraph cognition (observe → predict → generate → guardian)
 * 2. Persists workflow envelope for operational visibility
 * 3. Either auto-executes (if approved) or queues for review
 *
 * Temporal provides:
 * - Automatic retries on transient failures
 * - Durable state across process restarts
 * - Idempotent execution (workflow ID = signal ID)
 */
export async function omegaSignalWorkflow(
  input: OmegaWorkflowInput
): Promise<OmegaWorkflowResult> {
  // 1) Run LangGraph cognition
  const finalState = await runOmegaGraphActivity({
    signal: input.signal,
    userId: input.userId,
    userContext: input.userContext,
  });

  // 2) Persist workflow envelope (durable log)
  await persistOmegaActivity(finalState);

  // 3) Execute or queue for review based on safety decisions
  if (finalState.shouldAutoExecute) {
    const execution = await executeDraftActivity(finalState);

    return {
      sessionId: finalState.sessionId,
      executed: true,
      queued: false,
      execution: {
        action: execution.action,
        status: execution.status,
        executedAt: execution.executedAt,
      },
      errors: finalState.errors,
    };
  } else {
    // Queue for human review
    await queueForReviewActivity(finalState);

    return {
      sessionId: finalState.sessionId,
      executed: false,
      queued: true,
      errors: finalState.errors,
    };
  }
}

/**
 * Scheduled Omega workflow - for processing signals on a delay
 * Useful for "process this signal in 5 minutes" scenarios
 */
export async function scheduledOmegaSignalWorkflow(
  input: OmegaWorkflowInput & { delaySeconds?: number }
): Promise<OmegaWorkflowResult> {
  if (input.delaySeconds && input.delaySeconds > 0) {
    await sleep(`${input.delaySeconds} seconds`);
  }

  return omegaSignalWorkflow(input);
}
