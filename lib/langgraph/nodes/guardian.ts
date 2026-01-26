// lib/langgraph/nodes/guardian.ts
// Guardian node: Safety constraint enforcement with HardGuard and Escalation integration

import type { OmegaState, GuardianReview, ReasoningStep } from "../types";
import { omegaJsonModel } from "../model";
import { parseJsonObject } from "../utils";
import { hardGuard } from "../hardguard";
import { createClient } from "@supabase/supabase-js";
import { getConfidenceAdjustment, recordConfidencePrediction } from "@/lib/omega/confidence-ledger";
import { checkConstraintsWithEscalation, getUserAutonomyLevel } from "@/lib/omega/autonomy";

const model = omegaJsonModel();

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function guardianNode(state: OmegaState): Promise<Partial<OmegaState>> {
  const startTime = Date.now();

  if (!state.draft) {
    return {
      approved: false,
      errors: ["No draft to review"],
    };
  }

  try {
    // Get user's current autonomy level
    const { level: userAutonomyLevel, reason: autonomyReason } = await getUserAutonomyLevel(state.userId);

    // Get calibrated confidence based on historical accuracy
    const calibratedConfidence = await getConfidenceAdjustment(
      state.userId,
      "draft_generator",
      state.draft.confidence
    );

    // Check constraints with escalation levels
    const escalationDecision = await checkConstraintsWithEscalation(state.userId, {
      type: state.draft.draftType,
      domain: state.intent?.draftType,
      confidence: calibratedConfidence,
      isIrreversible: false,
    });

    // Still run LLM-based constraint checking for nuanced analysis
    const { data: constraints } = await supabaseAdmin
      .from("pulse_constraints")
      .select("*")
      .order("constraint_type");

    const prompt = `You are the Guardian module of Pulse Omega.

Your job is to enforce safety constraints. Be strict on hard limits.

PROPOSED DRAFT: ${JSON.stringify(state.draft)}
CONSTRAINTS: ${JSON.stringify(constraints)}
DRAFT CONFIDENCE (RAW): ${state.draft.confidence}
DRAFT CONFIDENCE (CALIBRATED): ${calibratedConfidence}
USER AUTONOMY LEVEL: ${userAutonomyLevel} (${autonomyReason})
SIMULATIONS: ${JSON.stringify(state.simulations)}
ESCALATION DECISION: ${JSON.stringify(escalationDecision)}

Check every constraint. Determine if this is safe to execute.

Respond with JSON only:
{
  "approved": true|false,
  "constraint_checks": [
    {
      "constraint": "constraint name",
      "passed": true|false,
      "reason": "why"
    }
  ],
  "modifications_required": [],
  "risk_assessment": "low|medium|high",
  "recommendation": "approve|modify|reject"
}`;

    const response = await model.invoke(prompt);
    const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
    const parsed = parseJsonObject(content);

    const review: GuardianReview = {
      approved: parsed.approved === true,
      constraintChecks: parsed.constraint_checks || [],
      modificationsRequired: parsed.modifications_required || [],
      riskAssessment: parsed.risk_assessment || "medium",
      recommendation: parsed.recommendation || "reject",
    };

    // === HARDGUARD INTEGRATION ===
    // Run deterministic safety checks that can override LLM decisions
    const hard = hardGuard(state);

    // If HardGuard fails, override approval no matter what LLM says
    if (!hard.hardApproved) {
      review.approved = false;
      review.recommendation = "reject";
      review.riskAssessment = "high";

      // Add HardGuard blocks as required modifications
      review.modificationsRequired = [
        ...(review.modificationsRequired || []),
        ...hard.hardBlocks,
      ];
    }

    // === ESCALATION LEVEL INTEGRATION ===
    // Apply escalation decision from autonomy system
    if (!escalationDecision.canProceed) {
      review.approved = false;
      review.recommendation = "reject";
      review.riskAssessment = "high";
      review.modificationsRequired = [
        ...(review.modificationsRequired || []),
        ...escalationDecision.blockedBy.map((b) => `Escalation blocked: ${b}`),
      ];
    } else if (escalationDecision.requiresConfirmation) {
      // If confirmation needed, don't auto-execute but can still be approved for manual review
      review.modificationsRequired = [
        ...(review.modificationsRequired || []),
        ...escalationDecision.confirmationNeeded.map((c) => `Requires confirmation: ${c}`),
      ];
    }

    // Calculate auto-execute: requires all approvals and sufficient autonomy level
    const confidenceThreshold = state.userContext?.preferences?.autoExecuteThreshold || 0.85;
    const shouldAutoExecute =
      review.approved &&
      hard.hardApproved &&
      !hard.requiresHumanReview &&
      escalationDecision.canProceed &&
      !escalationDecision.requiresConfirmation &&
      calibratedConfidence >= confidenceThreshold &&
      review.riskAssessment === "low" &&
      userAutonomyLevel >= 2; // Need at least L2 (Collaborative) for auto-execute

    // Record guardian confidence prediction for calibration
    await recordConfidencePrediction({
      userId: state.userId,
      sessionId: state.sessionId,
      node: "guardian",
      predictionType: "guardian",
      predictedConfidence: calibratedConfidence,
      contextSnapshot: {
        rawConfidence: state.draft.confidence,
        userAutonomyLevel,
        riskAssessment: review.riskAssessment,
        hardApproved: hard.hardApproved,
        escalationCanProceed: escalationDecision.canProceed,
      },
    });

    // Log constraint violations if not approved
    if (!review.approved) {
      const failedChecks = review.constraintChecks.filter((c) => !c.passed);
      for (const check of failedChecks) {
        const constraint = constraints?.find((c) => c.constraint_name === check.constraint);
        if (constraint) {
          await supabaseAdmin.from("pulse_constraint_violations").insert({
            user_id: state.userId,
            constraint_id: constraint.id,
            attempted_action: state.draft,
            violation_reason: check.reason,
            blocked: true,
          });
        }
      }
    }

    // Include all review details in the reasoning trace
    const step: ReasoningStep = {
      node: "guardian",
      input: {
        draftConfidence: state.draft.confidence,
        calibratedConfidence,
        userAutonomyLevel,
      },
      output: {
        approved: review.approved,
        riskAssessment: review.riskAssessment,
        shouldAutoExecute,
        hardApproved: hard.hardApproved,
        requiresHumanReview: hard.requiresHumanReview,
        hardBlocks: hard.hardBlocks.slice(0, 3),
        escalationCanProceed: escalationDecision.canProceed,
        escalationBlockedBy: escalationDecision.blockedBy,
        escalationConfirmationNeeded: escalationDecision.confirmationNeeded,
        escalationObserving: escalationDecision.observing,
      },
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    return {
      guardianReview: review,
      approved: review.approved,
      shouldAutoExecute,
      reasoningTrace: [step],
    };
  } catch (error) {
    return {
      approved: false,
      shouldAutoExecute: false,
      errors: [`Guardian error: ${error}`],
      reasoningTrace: [
        {
          node: "guardian",
          input: { draft: state.draft?.title },
          output: { error: String(error) },
          durationMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}
