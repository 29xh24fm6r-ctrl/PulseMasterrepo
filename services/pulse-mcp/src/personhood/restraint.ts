// personhood/restraint.ts
// Proactive restraint rules — senior behavior, not eager junior.
//
// Rules:
//   withhold_unrequested_insights: true
//   no_tangents_during_execution: true
//   save_observations_for_later: true
//
// Pulse may notice things and choose not to say them.
// That choice is intelligence.

import type { FamiliarityLevel } from "./types.js";

interface RestraintContext {
  is_executing: boolean;
  familiarity: FamiliarityLevel;
  observation_urgency: "low" | "medium" | "high" | "critical";
  observation_relevance: "tangential" | "related" | "direct";
}

/**
 * Determine whether an observation should be withheld.
 * Returns true if the observation should NOT be shared right now.
 */
export function shouldWithhold(ctx: RestraintContext): boolean {
  // Critical observations are always shared
  if (ctx.observation_urgency === "critical") return false;

  // During execution: no tangents
  if (ctx.is_executing && ctx.observation_relevance === "tangential") {
    return true;
  }

  // Unrequested insights are withheld unless directly relevant
  if (
    ctx.observation_relevance !== "direct" &&
    ctx.observation_urgency === "low"
  ) {
    return true;
  }

  // At low familiarity, withhold more
  if (ctx.familiarity <= 1 && ctx.observation_relevance !== "direct") {
    return true;
  }

  // High familiarity + related + medium urgency → share
  if (
    ctx.familiarity >= 2 &&
    ctx.observation_relevance === "related" &&
    ctx.observation_urgency === "medium"
  ) {
    return false;
  }

  // Default: withhold low-urgency tangential observations
  return ctx.observation_urgency === "low";
}

/**
 * Tag an observation for deferred sharing.
 * Returns a structured note to be saved for a better moment.
 */
export function deferObservation(
  observation: string,
  urgency: "low" | "medium" | "high",
): {
  content: string;
  memory_type: "observation";
  importance: number;
  meta: { deferred: true; urgency: string };
} {
  return {
    content: observation,
    memory_type: "observation",
    importance: urgency === "high" ? 0.8 : urgency === "medium" ? 0.5 : 0.3,
    meta: { deferred: true, urgency },
  };
}
