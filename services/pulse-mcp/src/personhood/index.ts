// personhood/index.ts
// Conversational Personhood Layer — main pipeline.
//
// Architectural position:
//   [ Intelligence (Signals / Proposals / Plans) ]
//                     ↓
//   [ Conversational Personhood Layer ]  ← THIS
//                     ↓
//   [ Output Renderer (text / voice / UI) ]
//
// This layer ONLY shapes: wording, timing, posture, question selection, restraint.
// It does NOT make decisions, execute actions, change data, or invent goals.

import { lint } from "./linter.js";
import { selectPosture } from "./posture.js";
import { determineFamiliarity } from "./familiarity.js";
import { presentProposal, shapeText } from "./present.js";
import { containsGroveling, cleanRecovery } from "./recovery.js";
import { loadPreferences } from "./taste.js";
import type {
  ConversationContext,
  PostureContext,
  ShapedOutput,
} from "./types.js";

export type { ShapedOutput, ConversationContext };

/**
 * Build a ConversationContext from system state.
 * Used by the shape pipeline and MCP tools.
 */
export async function buildContext(
  userId: string,
  overrides?: Partial<PostureContext>,
): Promise<ConversationContext> {
  const trust = {
    autonomy_level: overrides?.autonomy_level ?? 0,
    trust_score: overrides?.trust_score ?? 0.5,
  };

  const posture = selectPosture({
    proposal_type: overrides?.proposal_type,
    signal_severity: overrides?.signal_severity,
    autonomy_level: trust.autonomy_level,
    trust_score: trust.trust_score,
    recent_interaction_type: overrides?.recent_interaction_type,
  });

  const familiarity = determineFamiliarity(trust);
  const preferences = await loadPreferences(userId);

  return {
    posture,
    familiarity,
    trust,
    signal_count: 0,
    trigger_count: 0,
    preferences,
  };
}

/**
 * Shape raw text through the full personhood pipeline.
 *
 * Pipeline:
 *   1. Check for groveling → clean recovery
 *   2. Run forbidden output linter → clean
 *   3. Apply posture + familiarity shaping
 *   4. Return shaped output with metadata
 */
export function shape(
  text: string,
  ctx: ConversationContext,
): ShapedOutput {
  let working = text;

  // Step 1: Strip groveling
  if (containsGroveling(working)) {
    working = cleanRecovery(working);
  }

  // Step 2: Lint forbidden phrases/patterns
  const lintResult = lint(working);
  working = lintResult.cleaned;

  // Step 3: Shape with posture + familiarity
  working = shapeText(working, ctx);

  // Step 4: Final lint pass (shaping may have introduced issues)
  const finalLint = lint(working);
  working = finalLint.cleaned;

  // Count questions in final output
  const questionCount = (working.match(/\?/g) || []).length;

  return {
    text: working,
    posture: ctx.posture,
    familiarity_level: ctx.familiarity,
    lint_result: {
      passed: lintResult.passed && finalLint.passed,
      violations: [...lintResult.violations, ...finalLint.violations],
      cleaned: working,
    },
    question_count: questionCount,
  };
}

/**
 * Shape a design proposal through the personhood pipeline.
 * Generates conversational output from structured proposal data.
 */
export function shapeProposal(
  proposal: Parameters<typeof presentProposal>[0],
  ctx: ConversationContext,
): ShapedOutput {
  const presented = presentProposal(proposal, ctx);
  return shape(presented, ctx);
}

// Re-export key modules for direct use
export { lint, passes } from "./linter.js";
export { selectPosture, postureLabel } from "./posture.js";
export { determineFamiliarity, ackStyle } from "./familiarity.js";
export { parseFeedback, recordTasteSignal, loadPreferences, applySignal } from "./taste.js";
export { shouldWithhold, deferObservation } from "./restraint.js";
export { containsGroveling, cleanRecovery } from "./recovery.js";
export { analyzeQuestions, governQuestions } from "./questions.js";
