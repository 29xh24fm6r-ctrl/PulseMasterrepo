// tools/design_flags.ts
// Feature flags for Pulse Designer phases.
// Phase C: active features (proposals, explanations, suggestions)
// Phase D: passive substrate (metrics collection, no behavior change)
// Canon: Phase D MUST NOT influence any proposal while activation is false.

export const DESIGN_PHASE_C_ENABLED = true;
export const DESIGN_PHASE_D_ENABLED = true;       // instrumentation only
export const DESIGN_PHASE_D_ACTIVATION = false;    // MUST REMAIN FALSE

/**
 * Hard guard: throws if Phase D data is accessed for decision-making.
 * Call this at any point Phase D data would influence a proposal.
 */
export function assertPhaseDNotActive(): void {
  if (!DESIGN_PHASE_D_ACTIVATION) {
    throw new Error("Phase D activation is disabled.");
  }
}

export function isPhaseCEnabled(): boolean {
  return DESIGN_PHASE_C_ENABLED;
}

export function isPhaseDEnabled(): boolean {
  return DESIGN_PHASE_D_ENABLED;
}
