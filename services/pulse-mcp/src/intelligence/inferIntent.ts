// intelligence/inferIntent.ts
// Intent inference — pure logic, no ML.
// Maps signals to intents using a locked v1 mapping table.
// Each inferred intent includes type, confidence, and source signal IDs.

import type { InferredIntent } from "./types.js";

interface StoredSignal {
  id: string;
  signal_type: string;
  payload: Record<string, unknown>;
}

// ============================================
// MAPPING TABLE (LOCKED v1)
// ============================================
// | Signal                  | Intent                   | Notes                          |
// |-------------------------|--------------------------|--------------------------------|
// | repeat_question_3x_7d   | create_reference         | Ask if confidence < 0.75       |
// | stalled_task_defer_loop | replan_task              | Suggest smaller next action    |
// | deadline_risk           | surface_deadline_plan    | Interrupt only if trust >= 0.6 |
// | unanswered_thread_risk  | draft_followup           | Always proposal                |
// | system_degraded         | run_diagnostics          | Auto-propose                   |
// | user_overload           | suggest_reprioritization | Batch only                     |

const SIGNAL_TO_INTENT: Record<string, string> = {
  repeat_question_3x_7d: "create_reference",
  stalled_task_defer_loop: "replan_task",
  deadline_risk: "surface_deadline_plan",
  unanswered_thread_risk: "draft_followup",
  system_degraded: "run_diagnostics",
  user_overload: "suggest_reprioritization",
};

/**
 * Infer intents from a batch of signals.
 * Groups signals by type, maps each group to an intent.
 * Pure logic — no DB access, no side effects.
 */
export function inferIntents(signals: StoredSignal[]): InferredIntent[] {
  // Group signals by type
  const groups = new Map<string, StoredSignal[]>();
  for (const signal of signals) {
    const group = groups.get(signal.signal_type) ?? [];
    group.push(signal);
    groups.set(signal.signal_type, group);
  }

  const intents: InferredIntent[] = [];

  for (const [signalType, groupSignals] of groups) {
    const intentType = SIGNAL_TO_INTENT[signalType];
    if (!intentType) continue;

    // Aggregate confidence: take the max confidence from the group
    let maxConfidence = 0;
    for (const s of groupSignals) {
      const c = (s.payload?.confidence as number) ?? 0.5;
      if (c > maxConfidence) maxConfidence = c;
    }

    intents.push({
      intent_type: intentType,
      confidence: maxConfidence,
      source_signal_ids: groupSignals.map((s) => s.id),
    });
  }

  return intents;
}
