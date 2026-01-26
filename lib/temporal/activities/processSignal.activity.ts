// lib/temporal/activities/processSignal.activity.ts
// Activity: processSignalWithOmega
// SPEC: Cognition NEVER executes - this is thinking only

import { processSignalWithOmega as runOmegaGraph } from "@/lib/langgraph";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ProcessSignalInput, ProcessSignalOutput, GuardianDecision } from "../workflows/types";
import { randomUUID } from "crypto";

/**
 * Process a signal through Omega cognition (LangGraph)
 *
 * RULES (from spec):
 * - Deterministic for same input
 * - No side effects (except confidence events)
 * - Retryable
 *
 * This activity:
 * 1. Runs LangGraph cognition (observe → predict → generate → guardian)
 * 2. Records confidence predictions
 * 3. Returns intent, draft, and guardian decision
 */
export async function processSignalWithOmegaActivity(
  input: ProcessSignalInput
): Promise<ProcessSignalOutput> {
  const { signalId, userId, source, signalType, payload } = input;
  const sessionId = `omega-${signalId}-${Date.now()}`;

  // Build signal object for LangGraph
  const signal = {
    id: signalId,
    userId,
    source,
    signalType,
    payload,
    createdAt: new Date().toISOString(),
  };

  // Run LangGraph cognition
  const omegaState = await runOmegaGraph(signal, userId, {});

  // Extract confidence event IDs from reasoning trace
  const confidenceEventIds: string[] = [];
  const supabase = getSupabaseAdmin();

  // Record confidence prediction for calibration
  if (omegaState.draft?.confidence) {
    const eventId = randomUUID();
    confidenceEventIds.push(eventId);

    await supabase.from("pulse_confidence_events").insert({
      id: eventId,
      user_id: userId,
      node: "generator",
      predicted_confidence: omegaState.draft.confidence,
      context: {
        signalId,
        signalType,
        draftType: omegaState.draft.draftType,
        sessionId,
      },
      created_at: new Date().toISOString(),
    });
  }

  // Map guardian review to canonical GuardianDecision
  const guardianDecision = mapGuardianDecision(omegaState);

  return {
    intent: {
      id: omegaState.intent?.id || signalId,
      description: omegaState.intent?.description || "Unknown intent",
      predictedConfidence: omegaState.intent?.confidence || 0.5,
    },
    draft: omegaState.draft
      ? {
          id: omegaState.draft.id,
          type: omegaState.draft.draftType,
          content: omegaState.draft.content || {},
          confidence: omegaState.draft.confidence,
        }
      : undefined,
    guardianDecision,
    confidenceEventIds,
    sessionId,
    reasoningTrace: omegaState.reasoningTrace || [],
  };
}

/**
 * Map OmegaState guardian review to canonical GuardianDecision
 */
function mapGuardianDecision(omegaState: {
  approved?: boolean;
  guardianReview?: {
    approved?: boolean;
    constraintChecks?: Array<{
      constraint: string;
      passed: boolean;
      reason: string;
    }>;
    riskAssessment?: string;
    recommendation?: string;
  };
  canonicalDecision?: {
    allowed: boolean;
    required_action: "execute" | "queue_review" | "block";
    explanation: string;
    constraint_hits?: Array<{
      constraint: string;
      passed: boolean;
      reason: string;
      escalation_level?: string;
    }>;
  };
}): GuardianDecision {
  // Prefer canonical decision if available (from updated Guardian)
  if (omegaState.canonicalDecision) {
    return {
      allowed: omegaState.canonicalDecision.allowed,
      requiredAction: omegaState.canonicalDecision.required_action,
      explanation: omegaState.canonicalDecision.explanation,
      constraintHits: (omegaState.canonicalDecision.constraint_hits || []).map((hit) => ({
        name: hit.constraint,
        severity: hit.passed ? "soft" : "hard",
        blocked: !hit.passed,
      })),
    };
  }

  // Fallback: map from legacy guardianReview
  const review = omegaState.guardianReview;
  const allowed = omegaState.approved ?? false;

  let requiredAction: "execute" | "queue_review" | "block" = "queue_review";
  if (!allowed) {
    requiredAction = "block";
  } else if (review?.recommendation === "approve") {
    requiredAction = "execute";
  }

  return {
    allowed,
    requiredAction,
    explanation: review?.riskAssessment || "No explanation available",
    constraintHits: (review?.constraintChecks || []).map((check) => ({
      name: check.constraint,
      severity: check.passed ? "soft" : "hard",
      blocked: !check.passed,
    })),
  };
}
