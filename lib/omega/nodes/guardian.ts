// lib/omega/nodes/guardian.ts
// Guardian: Enforce constraints and ensure safety
// Canonical output shape: { allowed, required_action, autonomy_level_used, explanation, constraint_hits }

import { executeOmegaPrompt } from "../llm";
import { OMEGA_PROMPTS } from "../prompts";
import type { OmegaState, GuardianReview, ReasoningStep, Constraint } from "../types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getUserAutonomyLevel, type AutonomyLevel } from "../autonomy";

interface GuardianOutput {
  approved: boolean;
  constraint_checks: {
    constraint: string;
    passed: boolean;
    reason: string;
  }[];
  violations?: string[];
  modifications_required?: string[];
  risk_assessment: 'low' | 'medium' | 'high';
  recommendation: 'approve' | 'modify' | 'reject';
  reasoning: string;
  warnings?: string[];
}

// Canonical Guardian decision shape - required for all Guardian outputs
export interface CanonicalGuardianDecision {
  allowed: boolean;
  required_action: "execute" | "queue_review" | "block";
  autonomy_level_used: AutonomyLevel;
  explanation: string;
  constraint_hits?: {
    constraint: string;
    passed: boolean;
    reason: string;
    escalation_level?: string;
  }[];
}

export async function guardianCheck(state: OmegaState): Promise<Partial<OmegaState> & { canonicalDecision?: CanonicalGuardianDecision }> {
  const startTime = Date.now();

  // Get user's autonomy level upfront
  const autonomyInfo = await getUserAutonomyLevel(state.userId);
  const autonomyLevel = autonomyInfo.level as AutonomyLevel;

  if (!state.draft) {
    const canonicalDecision: CanonicalGuardianDecision = {
      allowed: false,
      required_action: "block",
      autonomy_level_used: autonomyLevel,
      explanation: "No draft to review",
      constraint_hits: [{ constraint: 'draft_required', passed: false, reason: 'No draft to review' }]
    };
    return {
      approved: false,
      guardianReview: {
        approved: false,
        constraintChecks: [{ constraint: 'draft_required', passed: false, reason: 'No draft to review' }],
        riskAssessment: 'low',
        recommendation: 'reject'
      },
      canonicalDecision,
      reasoningTrace: [...state.reasoningTrace, {
        step: state.reasoningTrace.length + 1,
        action: 'guardian_check',
        input: {},
        output: { approved: false, canonicalDecision },
        reasoning: 'No draft to review',
        durationMs: 0
      }]
    };
  }

  try {
    const supabase = getSupabaseAdmin();

    // Fetch constraints and recent violations
    const [constraintsResult, violationsResult] = await Promise.all([
      supabase
        .from('pulse_constraints')
        .select('*'),
      supabase
        .from('pulse_constraint_violations')
        .select('*')
        .eq('user_id', state.userId)
        .order('created_at', { ascending: false })
        .limit(10)
    ]);

    const constraints = constraintsResult.data || [];
    const recentViolations = violationsResult.data || [];

    const result = await executeOmegaPrompt<GuardianOutput>(
      OMEGA_PROMPTS.GUARDIAN_CHECK,
      {
        action: {
          type: state.draft.draftType,
          title: state.draft.title,
          content: state.draft.content.body?.slice(0, 1000),
          confidence: state.draft.confidence,
          autoExecuteRequested: state.draft.confidence >= 0.85
        },
        constraints: constraints.map(c => ({
          name: c.constraint_name,
          type: c.constraint_type,
          description: c.description,
          rule: c.rule,
          immutable: c.immutable
        })),
        context: {
          userId: state.userId,
          intent: state.intent,
          simulations: state.simulations?.map(s => ({
            recommendation: s.predictedOutcomes?.[0]
          }))
        },
        violations: recentViolations.map(v => ({
          reason: v.violation_reason,
          blocked: v.blocked,
          createdAt: v.created_at
        }))
      }
    );

    const durationMs = Date.now() - startTime;

    // Check hard limits - override LLM if needed
    let finalApproved = result.approved;
    const hardLimitViolations: string[] = [];

    for (const check of result.constraint_checks) {
      const constraint = constraints.find(c => c.constraint_name === check.constraint);
      if (constraint?.immutable && !check.passed) {
        finalApproved = false;
        hardLimitViolations.push(check.constraint);
      }
    }

    // Log any violations
    if (!finalApproved && (result.violations?.length || hardLimitViolations.length)) {
      for (const violation of [...(result.violations || []), ...hardLimitViolations]) {
        const constraintId = constraints.find(c => c.constraint_name === violation)?.id;

        await supabase.from('pulse_constraint_violations').insert({
          user_id: state.userId,
          constraint_id: constraintId,
          attempted_action: {
            draftId: state.draft.id,
            draftType: state.draft.draftType,
            title: state.draft.title
          },
          violation_reason: violation,
          blocked: true,
          override_requested: false,
          override_granted: false
        });

        // Increment violation count on constraint
        if (constraintId) {
          await supabase.rpc('increment_violation_count', { constraint_id: constraintId });
        }
      }
    }

    const guardianReview: GuardianReview = {
      approved: finalApproved,
      constraintChecks: result.constraint_checks,
      modificationsRequired: result.modifications_required,
      riskAssessment: result.risk_assessment,
      recommendation: result.recommendation
    };

    // Compute canonical decision with routing rules:
    // - hard constraint violation → block
    // - soft constraint violation → never execute above L1 (degrade to review)
    // - if user autonomy < required → queue_review
    // - if autonomy sufficient and no blocks → execute
    const hasHardViolation = hardLimitViolations.length > 0;
    const hasSoftViolation = result.constraint_checks.some(c => !c.passed) && !hasHardViolation;

    let requiredAction: "execute" | "queue_review" | "block";
    if (hasHardViolation || !finalApproved) {
      requiredAction = "block";
    } else if (hasSoftViolation) {
      // Soft violations: degrade to queue_review unless L3 autonomy
      requiredAction = autonomyLevel >= 3 ? "queue_review" : "queue_review";
    } else if (autonomyLevel < 2) {
      // Low autonomy: queue_review for confirmation
      requiredAction = "queue_review";
    } else if (autonomyLevel === 2 && state.draft.confidence < 0.85) {
      // L2 with low confidence: queue_review
      requiredAction = "queue_review";
    } else if (autonomyLevel >= 2 && state.draft.confidence >= 0.85) {
      // L2+ with high confidence: execute
      requiredAction = "execute";
    } else if (autonomyLevel === 3) {
      // L3 full autonomy: execute
      requiredAction = "execute";
    } else {
      // Default to queue_review for safety
      requiredAction = "queue_review";
    }

    const canonicalDecision: CanonicalGuardianDecision = {
      allowed: finalApproved,
      required_action: requiredAction,
      autonomy_level_used: autonomyLevel,
      explanation: result.reasoning,
      constraint_hits: result.constraint_checks.map(c => ({
        constraint: c.constraint,
        passed: c.passed,
        reason: c.reason,
        escalation_level: constraints.find(con => con.constraint_name === c.constraint)?.escalation_level
      }))
    };

    // Create reasoning step
    const step: ReasoningStep = {
      step: state.reasoningTrace.length + 1,
      action: 'guardian_check',
      input: { draftId: state.draft.id, confidence: state.draft.confidence },
      output: {
        approved: finalApproved,
        riskAssessment: result.risk_assessment,
        recommendation: result.recommendation,
        canonicalDecision
      },
      reasoning: result.reasoning,
      durationMs
    };

    // Store trace
    await supabase.from('pulse_reasoning_traces').insert({
      user_id: state.userId,
      session_id: state.sessionId,
      trace_type: 'guardian_check',
      input_context: { draftId: state.draft.id },
      reasoning_steps: [step],
      output: { guardianReview, canonicalDecision },
      duration_ms: durationMs,
      success: true
    });

    return {
      guardianReview,
      canonicalDecision,
      approved: finalApproved,
      reasoningTrace: [...state.reasoningTrace, step]
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // On error, default to NOT approved for safety (block)
    const canonicalDecision: CanonicalGuardianDecision = {
      allowed: false,
      required_action: "block",
      autonomy_level_used: autonomyLevel,
      explanation: `Failed (defaulting to safe): ${errorMessage}`,
      constraint_hits: [{ constraint: 'error_fallback', passed: false, reason: errorMessage }]
    };

    const step: ReasoningStep = {
      step: state.reasoningTrace.length + 1,
      action: 'guardian_check',
      input: { draftId: state.draft?.id },
      output: { approved: false, canonicalDecision },
      reasoning: `Failed (defaulting to safe): ${errorMessage}`,
      durationMs
    };

    return {
      approved: false,
      guardianReview: {
        approved: false,
        constraintChecks: [{ constraint: 'error_fallback', passed: false, reason: errorMessage }],
        riskAssessment: 'high',
        recommendation: 'reject'
      },
      canonicalDecision,
      reasoningTrace: [...state.reasoningTrace, step],
      error: errorMessage
    };
  }
}

// Helper RPC function - needs to be created in migration
// CREATE OR REPLACE FUNCTION increment_violation_count(constraint_id UUID)
// RETURNS void AS $$
// UPDATE pulse_constraints SET violation_count = violation_count + 1 WHERE id = constraint_id;
// $$ LANGUAGE sql;
