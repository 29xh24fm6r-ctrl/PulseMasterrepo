// personhood/familiarity.ts
// Earned familiarity gradient — tied directly to Trust / Autonomy.
//
// L0: "Neutral professional"    → "Got it. I'll draft that."
// L1: "Relaxed professional"    → "Got it — drafting now."
// L2: "Trusted collaborator"    → "On it."
// L3: "Shorthand mode"          → "Done."
//
// Rules:
//   - Familiarity NEVER increases from time alone
//   - Increases only via accepted proposals, positive taste signals, sustained calibration
//   - May decrease after rejection or correction

import type { FamiliarityLevel } from "./types.js";

interface TrustInput {
  autonomy_level: number;
  trust_score: number;
}

/**
 * Determine familiarity level from trust state.
 * Pure function — maps trust metrics to familiarity bracket.
 */
export function determineFamiliarity(trust: TrustInput): FamiliarityLevel {
  const { autonomy_level, trust_score } = trust;

  // L3: Shorthand mode — high autonomy + high trust
  if (autonomy_level >= 4 && trust_score >= 0.8) return 3;

  // L2: Trusted collaborator — moderate-high autonomy + decent trust
  if (autonomy_level >= 3 && trust_score >= 0.6) return 2;

  // L1: Relaxed professional — some autonomy + baseline trust
  if (autonomy_level >= 1 && trust_score >= 0.4) return 1;

  // L0: Neutral professional — default
  return 0;
}

/**
 * Get the greeting/acknowledgment style for a familiarity level.
 */
export function ackStyle(level: FamiliarityLevel): string {
  switch (level) {
    case 0:
      return "Got it. I'll draft that.";
    case 1:
      return "Got it — drafting now.";
    case 2:
      return "On it.";
    case 3:
      return "Done.";
  }
}

/**
 * Get the verbosity factor for a familiarity level.
 * Lower = more terse.
 */
export function verbosityFactor(level: FamiliarityLevel): number {
  switch (level) {
    case 0:
      return 1.0;
    case 1:
      return 0.85;
    case 2:
      return 0.65;
    case 3:
      return 0.4;
  }
}
