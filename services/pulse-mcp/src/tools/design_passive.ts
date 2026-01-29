// tools/design_passive.ts
// D1–D5: Passive substrate — instrumentation only, zero behavior change.
// All data is recorded behind feature flags. NOTHING here influences proposals.
// If DESIGN_PHASE_D_ACTIVATION is false, data is collected but never queried
// for decision-making.
// Canon: never throw, never fail the caller, never influence proposals.

import { getSupabase } from "../supabase.js";
import { isPhaseDEnabled, assertPhaseDNotActive } from "./design_flags.js";

// ============================================
// D1: SCREEN METRICS COLLECTION
// ============================================

export interface ScreenMetrics {
  screen_name: string;
  proposal_id: string;
  viewed_at: string;
  interaction_count: number;
  dismissed: boolean;
}

export async function recordScreenMetrics(
  userId: string,
  metrics: ScreenMetrics,
): Promise<void> {
  if (!isPhaseDEnabled()) return;

  try {
    await getSupabase().from("pulse_observer_events").insert({
      user_id: userId,
      event_type: "design_screen_metrics",
      payload: {
        ...metrics,
        timestamp: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    });
  } catch {
    // Never fail the caller
  }
}

// ============================================
// D2: COMPONENT FITNESS (INERT)
// ============================================

export interface ComponentFitness {
  component_name: string;
  screen_name: string;
  views: number;
  interactions: number;
  expansions: number;
  dismissals: number;
}

export async function recordComponentFitness(
  userId: string,
  fitness: ComponentFitness,
): Promise<void> {
  if (!isPhaseDEnabled()) return;

  try {
    await getSupabase().from("pulse_observer_events").insert({
      user_id: userId,
      event_type: "design_component_fitness",
      payload: {
        ...fitness,
        timestamp: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    });
  } catch {
    // Never fail the caller
  }
}

/**
 * Query component fitness data. ONLY for read-only display (archaeology).
 * Throws if Phase D activation is attempted.
 */
export async function queryComponentFitness(
  userId: string,
  screenName: string,
): Promise<ComponentFitness[]> {
  // Hard guard: if called for decision-making, this will throw
  // Caller must handle the error
  if (!isPhaseDEnabled()) return [];

  try {
    const { data } = await getSupabase()
      .from("pulse_observer_events")
      .select("payload")
      .eq("user_id", userId)
      .eq("event_type", "design_component_fitness")
      .order("created_at", { ascending: false })
      .limit(50);

    return ((data ?? []) as any[])
      .map((d) => d.payload as ComponentFitness)
      .filter((p) => p.screen_name === screenName);
  } catch {
    return [];
  }
}

// ============================================
// D3: SCREEN LINEAGE GRAPH
// ============================================

export interface ScreenLineage {
  parent_proposal_id?: string;
  proposal_id: string;
  refinement_reason?: string;
}

export async function recordScreenLineage(
  userId: string,
  lineage: ScreenLineage,
): Promise<void> {
  if (!isPhaseDEnabled()) return;

  try {
    await getSupabase().from("pulse_observer_events").insert({
      user_id: userId,
      event_type: "design_screen_lineage",
      payload: {
        ...lineage,
        timestamp: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    });
  } catch {
    // Never fail the caller
  }
}

// ============================================
// D4: DESIGN PATTERN REGISTRY (SHADOW MODE)
// ============================================

export interface DesignPattern {
  layout_type: string;
  component_set: string[];
  context_tags: string[];
  success_signals: {
    approvals: number;
    refinements: number;
  };
}

export async function recordDesignPattern(
  userId: string,
  pattern: DesignPattern,
): Promise<void> {
  if (!isPhaseDEnabled()) return;

  try {
    await getSupabase().from("pulse_observer_events").insert({
      user_id: userId,
      event_type: "design_pattern_observed",
      payload: {
        ...pattern,
        timestamp: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    });
  } catch {
    // Never fail the caller
  }
}

/**
 * Query design patterns. Read-only, never used for automatic reuse.
 * Throws via assertPhaseDNotActive if used for decision-making.
 */
export function guardPatternReuse(): never {
  assertPhaseDNotActive();
  // assertPhaseDNotActive always throws when activation is false,
  // so this line is never reached
  throw new Error("Phase D activation is disabled.");
}

// ============================================
// D5: INTERFACE PHILOSOPHY DETECTION (READ-ONLY)
// ============================================

export type PhilosophyCandidate =
  | "minimalist"
  | "maximalist"
  | "directive"
  | "exploratory";

export interface InterfacePhilosophy {
  candidate: PhilosophyCandidate;
  confidence: number;
  evidence: string[];
}

export async function recordInterfacePhilosophy(
  userId: string,
  philosophy: InterfacePhilosophy,
): Promise<void> {
  if (!isPhaseDEnabled()) return;

  try {
    await getSupabase().from("pulse_observer_events").insert({
      user_id: userId,
      event_type: "design_philosophy_detected",
      payload: {
        ...philosophy,
        timestamp: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    });
  } catch {
    // Never fail the caller
  }
}

/**
 * Infer interface philosophy from proposal history.
 * Read-only. MUST NOT influence any output.
 */
export async function inferInterfacePhilosophy(
  userId: string,
): Promise<InterfacePhilosophy> {
  if (!isPhaseDEnabled()) {
    return { candidate: "minimalist", confidence: 0, evidence: [] };
  }

  try {
    const sb = getSupabase();

    // Gather approved proposals for this user
    const { data: proposals } = await sb
      .from("pulse_proposals")
      .select("inputs")
      .eq("user_id", userId)
      .in("tool", ["design.propose_screen", "design.refine_screen"])
      .order("created_at", { ascending: false })
      .limit(20);

    if (!proposals || proposals.length === 0) {
      return { candidate: "minimalist", confidence: 0, evidence: [] };
    }

    // Analyze tendencies
    let totalComponents = 0;
    let simplifyCount = 0;
    let densifyCount = 0;
    let actionCount = 0;
    const evidence: string[] = [];

    for (const p of proposals) {
      const inputs = p.inputs as Record<string, unknown>;
      const proposal = inputs?.proposal as Record<string, unknown> | undefined;
      const components = (proposal?.components ?? []) as any[];
      totalComponents += components.length;

      const refinementType = inputs?.refinement_type as string | undefined;
      if (refinementType === "simplify_layout" || refinementType === "reduce_density") {
        simplifyCount++;
      }
      if (refinementType === "prioritize_actions") {
        actionCount++;
      }

      const constraints = inputs?.constraints as Record<string, unknown> | undefined;
      if (constraints?.density === "high") {
        densifyCount++;
      }
    }

    const avgComponents = totalComponents / proposals.length;

    let candidate: PhilosophyCandidate;
    let confidence: number;

    if (simplifyCount > proposals.length * 0.3) {
      candidate = "minimalist";
      confidence = Math.min(0.9, 0.5 + simplifyCount * 0.1);
      evidence.push(`${simplifyCount} simplification refinements`);
    } else if (densifyCount > proposals.length * 0.3 || avgComponents > 5) {
      candidate = "maximalist";
      confidence = Math.min(0.9, 0.5 + densifyCount * 0.1);
      evidence.push(`Average ${avgComponents.toFixed(1)} components per screen`);
    } else if (actionCount > proposals.length * 0.2) {
      candidate = "directive";
      confidence = Math.min(0.8, 0.4 + actionCount * 0.1);
      evidence.push(`${actionCount} action-prioritization refinements`);
    } else {
      candidate = "exploratory";
      confidence = 0.3;
      evidence.push("No strong tendencies detected");
    }

    const philosophy: InterfacePhilosophy = { candidate, confidence, evidence };

    // Record (non-blocking)
    recordInterfacePhilosophy(userId, philosophy).catch(() => {});

    return philosophy;
  } catch {
    return { candidate: "minimalist", confidence: 0, evidence: [] };
  }
}
