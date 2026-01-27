// omega-gate/effects.ts
// Effects ledger — immutable audit trail for every gate call.
// Every call writes BEFORE execution. Post-execution updates status.

import { randomUUID } from "crypto";
import { getSupabase } from "../supabase.js";
import type { GateRequest, GateHeaders } from "./validation.js";
import type { ConfidenceResult } from "./confidence.js";
import { createHash } from "crypto";

export type EffectStatus = "proposed" | "approved" | "executed" | "denied" | "require_human";

export interface EffectRecord {
  effect_id: string;
  call_id: string;
  agent: string;
  tool: string;
  scope: string;
  intent: string;
  inputs_hash: string;
  confidence_score: number;
  confidence_verdict: string;
  status: EffectStatus;
  result_hash?: string;
  reversible?: boolean;
  created_at: string;
  completed_at?: string;
}

function hashInputs(inputs: Record<string, unknown>): string {
  return createHash("sha256")
    .update(JSON.stringify(inputs))
    .digest("hex")
    .slice(0, 16);
}

/**
 * Write effect BEFORE execution (pre-flight record).
 */
export async function recordEffectProposed(
  headers: GateHeaders,
  request: GateRequest,
  confidence: ConfidenceResult
): Promise<string> {
  const effectId = randomUUID();
  const now = new Date().toISOString();

  const record: EffectRecord = {
    effect_id: effectId,
    call_id: request.call_id,
    agent: headers.agent,
    tool: request.tool,
    scope: headers.scope,
    intent: request.intent,
    inputs_hash: hashInputs(request.inputs),
    confidence_score: confidence.score,
    confidence_verdict: confidence.verdict,
    status: confidence.verdict === "deny" ? "denied" : "proposed",
    created_at: now,
  };

  try {
    const { error } = await getSupabase().from("pulse_effects").insert({
      id: record.effect_id,
      call_id: record.call_id,
      agent: record.agent,
      tool: record.tool,
      scope: record.scope,
      intent: record.intent,
      inputs_hash: record.inputs_hash,
      confidence_score: record.confidence_score,
      confidence_verdict: record.confidence_verdict,
      status: record.status,
      created_at: record.created_at,
    });

    if (error) {
      console.error("[omega-gate] Failed to record effect:", error.message);
    }
  } catch (err) {
    // Effects ledger failure must not block the gate
    console.error("[omega-gate] Effects write error:", err);
  }

  return effectId;
}

/**
 * Update effect after execution completes.
 */
export async function updateEffectCompleted(
  effectId: string,
  status: EffectStatus,
  resultHash?: string,
  reversible?: boolean
): Promise<void> {
  try {
    const { error } = await getSupabase()
      .from("pulse_effects")
      .update({
        status,
        result_hash: resultHash,
        reversible: reversible ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", effectId);

    if (error) {
      console.error("[omega-gate] Failed to update effect:", error.message);
    }
  } catch (err) {
    console.error("[omega-gate] Effects update error:", err);
  }
}
