// lib/temporal/workflows/omegaTrust.workflow.ts
// OmegaTrustWorkflow - The canonical trust engine for Omega
//
// SPEC: This workflow is the sole mechanism by which Omega earns autonomy.
//       No action may execute outside it.
//
// Phase 1 Implementation:
// - processSignalWithOmega
// - persistDraft
// - block / queue / execute routing
// - recordOutcome

import { proxyActivities } from "@temporalio/workflow";
import type * as activities from "../activities";
import type {
  OmegaTrustWorkflowInput,
  OmegaTrustWorkflowOutput,
  GuardianDecision,
  OutcomeType,
} from "./types";

// ============================================
// ACTIVITY PROXIES
// ============================================

const {
  processSignalWithOmegaActivity,
  persistDraftActivity,
  executeDraftActionActivity,
  queueForReviewNewActivity,
  recordOutcomeActivity,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "2 minutes",
  retry: {
    maximumAttempts: 5,
    initialInterval: "2s",
    backoffCoefficient: 2,
    maximumInterval: "1 minute",
  },
});

// recordOutcome has special retry policy - must succeed
const recordOutcomeWithRetry = proxyActivities<Pick<typeof activities, "recordOutcomeActivity">>({
  startToCloseTimeout: "5 minutes",
  retry: {
    maximumAttempts: 100, // Must succeed
    initialInterval: "5s",
    backoffCoefficient: 1.5,
    maximumInterval: "5 minutes",
  },
}).recordOutcomeActivity;

// ============================================
// AUTONOMY HELPERS
// ============================================

/**
 * Check if autonomy level allows execution for given action type
 * SPEC: Autonomy NEVER overrides Guardian
 */
function autonomyAllowsExecution(
  autonomyLevel: number,
  draftType: string,
  confidence: number
): boolean {
  // L0: Observe only - never execute
  if (autonomyLevel === 0) return false;

  // L1: Low-risk internal only, high confidence required
  if (autonomyLevel === 1) {
    const lowRiskActions = new Set(["update_note", "create_reminder"]);
    return lowRiskActions.has(draftType) && confidence >= 0.9;
  }

  // L2: Medium-risk, confidence >= 0.85
  if (autonomyLevel === 2) {
    return confidence >= 0.85;
  }

  // L3: Full autonomy (but still respects Guardian + irreversible rules)
  if (autonomyLevel >= 3) {
    return confidence >= 0.7;
  }

  return false;
}

/**
 * Get user's autonomy level
 * In real implementation, this would be fetched from pulse_user_autonomy
 * For Phase 1, we pass it through the workflow or default to L1
 */
function getAutonomyLevel(): number {
  // TODO: Phase 3 - Fetch from database via query activity
  // For now, default to L1 (conservative)
  return 1;
}

/**
 * Compute idempotency key for execution
 * SPEC: hash(workflowId + draftId + actionType)
 * Note: Using simple concatenation since workflow sandbox doesn't allow crypto
 * The uniqueness comes from workflowId which is already unique per signal
 */
function computeIdempotencyKey(
  workflowId: string,
  draftId: string,
  actionType: string
): string {
  // Simple deterministic key - workflowId already ensures uniqueness
  return `${workflowId}:${draftId}:${actionType}`;
}

// ============================================
// MAIN WORKFLOW
// ============================================

/**
 * OmegaTrustWorkflow - The canonical trust engine
 *
 * Flow:
 * 1. Receive signal
 * 2. Run Omega cognition (LangGraph)
 * 3. Apply Guardian constraints
 * 4. Enforce autonomy rules
 * 5. Execute OR queue for review
 * 6. Record outcome
 *
 * Non-negotiables:
 * - Cognition NEVER executes
 * - Execution NEVER decides
 * - Guardian ALWAYS gates
 * - Outcomes ALWAYS recorded
 * - Autonomy is EARNED, never assumed
 */
export async function OmegaTrustWorkflow(
  input: OmegaTrustWorkflowInput
): Promise<OmegaTrustWorkflowOutput> {
  const startedAt = new Date().toISOString();
  const workflowId = `omega-trust-${input.signalId}`;
  let outcomeType: OutcomeType = "failure";
  let guardianDecision: GuardianDecision = {
    allowed: false,
    requiredAction: "block",
    explanation: "Not yet processed",
    constraintHits: [],
  };
  let autonomyLevel = getAutonomyLevel();
  let confidenceEventIds: string[] = [];
  let sessionId = "";
  let draftId: string | undefined;

  try {
    // ========================================
    // STEP 1: Process signal with Omega cognition
    // ========================================
    const processResult = await processSignalWithOmegaActivity({
      signalId: input.signalId,
      userId: input.userId,
      source: input.source,
      signalType: input.signalType,
      payload: input.payload,
    });

    sessionId = processResult.sessionId;
    guardianDecision = processResult.guardianDecision;
    confidenceEventIds = processResult.confidenceEventIds;

    // ========================================
    // STEP 2: Apply Guardian constraints (CANONICAL ROUTING)
    // ========================================

    // RULE: If Guardian says not allowed, BLOCK
    if (!guardianDecision.allowed) {
      outcomeType = "rejected";

      // Record outcome (must succeed)
      await recordOutcomeWithRetry({
        userId: input.userId,
        sessionId,
        draftId: processResult.draft?.id,
        confidenceEventIds,
        outcomeType,
        notes: `Guardian blocked: ${guardianDecision.explanation}`,
      });

      return {
        status: "blocked",
        guardianDecision,
        autonomyLevelUsed: autonomyLevel,
        outcome: { type: outcomeType, notes: guardianDecision.explanation },
        autonomyChanged: false,
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - new Date(startedAt).getTime(),
      };
    }

    // ========================================
    // STEP 3: Persist draft if exists
    // ========================================
    if (processResult.draft) {
      draftId = processResult.draft.id;

      await persistDraftActivity({
        draftId: processResult.draft.id,
        userId: input.userId,
        content: processResult.draft.content,
        draftType: processResult.draft.type,
        confidence: processResult.draft.confidence,
        sessionId,
      });

      // ========================================
      // STEP 4: Route based on Guardian + Autonomy
      // ========================================
      const { requiredAction } = guardianDecision;

      // RULE: Guardian says queue_review → QUEUE
      if (requiredAction === "queue_review") {
        await queueForReviewNewActivity({
          draftId: processResult.draft.id,
          userId: input.userId,
          sessionId,
          guardianDecision,
          priority: input.priority,
        });

        outcomeType = "timeout"; // Pending human decision

        return {
          status: "completed",
          guardianDecision,
          autonomyLevelUsed: autonomyLevel,
          outcome: { type: "timeout", notes: "Queued for human review" },
          autonomyChanged: false,
          startedAt,
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - new Date(startedAt).getTime(),
        };
      }

      // RULE: Guardian says execute + autonomy allows → EXECUTE
      if (
        requiredAction === "execute" &&
        autonomyAllowsExecution(
          autonomyLevel,
          processResult.draft.type,
          processResult.draft.confidence
        )
      ) {
        const idempotencyKey = computeIdempotencyKey(
          workflowId,
          processResult.draft.id,
          processResult.draft.type
        );

        const executionResult = await executeDraftActionActivity({
          draftId: processResult.draft.id,
          draftType: processResult.draft.type,
          userId: input.userId,
          autonomyLevel,
          guardianApproved: true,
          idempotencyKey,
        });

        if (executionResult.executed) {
          outcomeType = "success";
        } else if (executionResult.idempotent) {
          outcomeType = "success"; // Already executed
        } else if (executionResult.skipped) {
          outcomeType = "rejected";
        } else {
          outcomeType = "failure";
        }

        // Record outcome (must succeed)
        await recordOutcomeWithRetry({
          userId: input.userId,
          sessionId,
          draftId: processResult.draft.id,
          confidenceEventIds,
          outcomeType,
          notes: executionResult.status,
        });

        return {
          status: "completed",
          guardianDecision,
          autonomyLevelUsed: autonomyLevel,
          outcome: { type: outcomeType, notes: executionResult.status },
          autonomyChanged: false,
          startedAt,
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - new Date(startedAt).getTime(),
        };
      }

      // DEFAULT: Queue for review (safety fallback)
      await queueForReviewNewActivity({
        draftId: processResult.draft.id,
        userId: input.userId,
        sessionId,
        guardianDecision,
        priority: input.priority,
      });

      outcomeType = "timeout";

      return {
        status: "completed",
        guardianDecision,
        autonomyLevelUsed: autonomyLevel,
        outcome: { type: "timeout", notes: "Queued for review (autonomy insufficient)" },
        autonomyChanged: false,
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - new Date(startedAt).getTime(),
      };
    }

    // No draft generated - signal was observation only
    outcomeType = "success";

    await recordOutcomeWithRetry({
      userId: input.userId,
      sessionId,
      confidenceEventIds,
      outcomeType,
      notes: "Signal processed, no action required",
    });

    return {
      status: "completed",
      guardianDecision,
      autonomyLevelUsed: autonomyLevel,
      outcome: { type: "success", notes: "Observation only" },
      autonomyChanged: false,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - new Date(startedAt).getTime(),
    };
  } catch (error) {
    // Record failure outcome
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    try {
      await recordOutcomeWithRetry({
        userId: input.userId,
        sessionId: sessionId || `error-${input.signalId}`,
        draftId,
        confidenceEventIds,
        outcomeType: "failure",
        notes: errorMessage,
      });
    } catch {
      // Even outcome recording failed - log and continue
      console.error("[OmegaTrustWorkflow] Failed to record failure outcome");
    }

    return {
      status: "error",
      guardianDecision,
      autonomyLevelUsed: autonomyLevel,
      outcome: { type: "failure", notes: errorMessage },
      autonomyChanged: false,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - new Date(startedAt).getTime(),
    };
  }
}
