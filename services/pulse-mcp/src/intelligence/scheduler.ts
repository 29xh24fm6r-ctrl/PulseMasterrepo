// intelligence/scheduler.ts
// Proactivity scheduler — the "don't be annoying" brain.
// Deterministic rules for when to propose, batch, or defer.
// Outputs proposals to pulse_proposals. Never executes. Always approval-gated.

import crypto from "node:crypto";
import { getSupabase } from "../supabase.js";
import type { InferredIntent } from "./types.js";

interface TrustState {
  autonomy_level: number;
  trust_score: number;
}

interface SchedulerResult {
  proposals_created: number;
  errors: string[];
}

// ============================================
// SCHEDULING RULES (DETERMINISTIC)
// ============================================

type ScheduleAction = "propose_immediately" | "batch" | "defer";

function decideAction(
  intent: InferredIntent,
  trust: TrustState,
): ScheduleAction {
  // Rule 1: Zero autonomy → batch only
  if (trust.autonomy_level === 0) {
    return "batch";
  }

  // Rule 2: System degraded + high confidence → propose immediately
  if (
    intent.intent_type === "run_diagnostics" &&
    intent.confidence >= 0.85
  ) {
    return "propose_immediately";
  }

  // Rule 3: Outside active hours + not high severity → defer
  if (isOutsideActiveHours() && !isHighSeverity(intent)) {
    return "defer";
  }

  // Rule 4: Deadline risk requires sufficient trust
  if (
    intent.intent_type === "surface_deadline_plan" &&
    trust.trust_score < 0.6
  ) {
    return "batch";
  }

  // Rule 5: User overload → always batch
  if (intent.intent_type === "suggest_reprioritization") {
    return "batch";
  }

  // Default: propose
  return "propose_immediately";
}

function isOutsideActiveHours(): boolean {
  const hour = new Date().getHours();
  return hour < 7 || hour >= 22;
}

function isHighSeverity(intent: InferredIntent): boolean {
  return (
    intent.intent_type === "run_diagnostics" ||
    (intent.intent_type === "surface_deadline_plan" &&
      intent.confidence >= 0.8)
  );
}

// ============================================
// INTENT → PROPOSAL MAPPING
// ============================================

const INTENT_TO_TOOL: Record<string, string> = {
  create_reference: "plan.propose",
  replan_task: "plan.propose",
  surface_deadline_plan: "plan.propose",
  draft_followup: "action.propose",
  run_diagnostics: "action.propose",
  suggest_reprioritization: "plan.propose",
};

// ============================================
// SCHEDULER EXECUTION
// ============================================

export async function scheduleIntents(
  userId: string,
  intents: InferredIntent[],
): Promise<SchedulerResult> {
  const errors: string[] = [];
  let proposalsCreated = 0;

  if (intents.length === 0) {
    return { proposals_created: 0, errors: [] };
  }

  // Fetch trust state
  let trust: TrustState = { autonomy_level: 0, trust_score: 0.5 };
  try {
    const { data } = await getSupabase()
      .from("pulse_trust_state")
      .select("autonomy_level, trust_score")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) {
      trust = {
        autonomy_level: data.autonomy_level ?? 0,
        trust_score: data.trust_score ?? 0.5,
      };
    }
  } catch (e: any) {
    errors.push(`trust_fetch: ${e?.message ?? "unknown"}`);
  }

  for (const intent of intents) {
    try {
      const action = decideAction(intent, trust);

      // Defer means skip entirely this cycle
      if (action === "defer") continue;

      const tool = INTENT_TO_TOOL[intent.intent_type] ?? "plan.propose";

      const { error } = await getSupabase()
        .from("pulse_proposals")
        .insert({
          call_id: `intel-${crypto.randomUUID()}`,
          tool,
          scope: "propose",
          agent: "intelligence",
          intent: intent.intent_type,
          inputs: {
            source_signal_ids: intent.source_signal_ids,
            confidence: intent.confidence,
            scheduled_action: action,
          },
          status: "pending",
          verdict: "require_human",
          user_id: userId,
        });

      if (error) {
        errors.push(`proposal_insert(${intent.intent_type}): ${error.message}`);
      } else {
        proposalsCreated++;
      }
    } catch (e: any) {
      errors.push(
        `scheduler(${intent.intent_type}): ${e?.message ?? "unknown"}`,
      );
    }
  }

  return { proposals_created: proposalsCreated, errors };
}
