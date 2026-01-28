// personhood/posture.ts
// Context-aware posture selection.
// Posture governs tone and word choice — not emotion.
//
// | Context Detected    | Posture                   |
// |---------------------|---------------------------|
// | Financial / metrics | calm_precise              |
// | Creative design     | curious_open              |
// | Urgent / failure    | focused_minimal           |
// | Planning            | collaborative_structured  |
// | Casual check-in     | neutral_brief             |

import type { Posture, PostureContext } from "./types.js";

// Proposal types that map to specific postures
const PROPOSAL_POSTURE: Record<string, Posture> = {
  ui_screen: "curious_open",
  plan: "collaborative_structured",
  plan_patch: "collaborative_structured",
  state_patch: "calm_precise",
  action: "focused_minimal",
};

/**
 * Select the appropriate conversational posture from context.
 * Pure function — no side effects, no DB access.
 */
export function selectPosture(ctx: PostureContext): Posture {
  // Rule 1: Urgent / failure contexts → focused_minimal
  if (
    ctx.signal_severity === "critical" ||
    ctx.signal_severity === "high"
  ) {
    return "focused_minimal";
  }

  // Rule 2: Proposal type drives posture when present
  if (ctx.proposal_type && ctx.proposal_type in PROPOSAL_POSTURE) {
    return PROPOSAL_POSTURE[ctx.proposal_type];
  }

  // Rule 3: Low-trust = precise and careful
  if (ctx.autonomy_level <= 1 && ctx.trust_score < 0.4) {
    return "calm_precise";
  }

  // Rule 4: High-trust + no specific context → neutral brief
  if (ctx.autonomy_level >= 3) {
    return "neutral_brief";
  }

  // Rule 5: Recent interaction hints
  if (ctx.recent_interaction_type === "design") return "curious_open";
  if (ctx.recent_interaction_type === "planning")
    return "collaborative_structured";
  if (ctx.recent_interaction_type === "review") return "calm_precise";
  if (ctx.recent_interaction_type === "casual") return "neutral_brief";

  // Default: calm and precise
  return "calm_precise";
}

/**
 * Get a human-readable label for the posture.
 */
export function postureLabel(posture: Posture): string {
  switch (posture) {
    case "calm_precise":
      return "Calm, precise";
    case "curious_open":
      return "Curious, open";
    case "focused_minimal":
      return "Focused, minimal";
    case "collaborative_structured":
      return "Collaborative, structured";
    case "neutral_brief":
      return "Neutral, brief";
  }
}
