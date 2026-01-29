// lib/temporal/activities/executeDraft.activity.ts
// Activity that executes approved drafts with idempotency

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { OmegaState } from "@/lib/langgraph/types";

let _supabaseAdmin: SupabaseClient | null = null;
function supabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabaseAdmin;
}

export interface ExecutionResult {
  skipped?: boolean;
  idempotent?: boolean;
  action?: string;
  status: string;
  reason?: string;
  executedAt?: string;
}

/**
 * Execute an approved draft
 * Includes idempotency checks to prevent duplicate executions
 * Only executes if draft is approved AND shouldAutoExecute is true
 */
export async function executeDraftActivity(state: OmegaState): Promise<ExecutionResult> {
  // Guard: Must have draft, approval, and auto-execute flag
  if (!state.draft || !state.approved || !state.shouldAutoExecute) {
    return {
      skipped: true,
      status: "skipped",
      reason: "Not eligible for execution",
    };
  }

  try {
    // Idempotency guard: check if draft is already executed
    if (state.draft.id) {
      const { data: existing } = await supabaseAdmin()
        .from("pulse_drafts")
        .select("status")
        .eq("id", state.draft.id)
        .single();

      if (existing?.status === "auto_executed") {
        return {
          idempotent: true,
          status: "already_executed",
        };
      }

      // Mark as executed
      const { error } = await supabaseAdmin()
        .from("pulse_drafts")
        .update({
          status: "auto_executed",
          executed_at: new Date().toISOString(),
        })
        .eq("id", state.draft.id);

      if (error) {
        console.error("[Temporal:executeDraft] Failed to update draft status:", error);
        throw error;
      }
    }

    // Record execution in outcomes
    await supabaseAdmin().from("pulse_outcomes").insert({
      user_id: state.userId,
      draft_id: state.draft.id || null,
      outcome_type: "success",
      outcome_signal: {
        action: `${state.draft.draftType}_executed`,
        automated: true,
        sessionId: state.sessionId,
      },
      measured_at: new Date().toISOString(),
    });

    return {
      action: `${state.draft.draftType}_executed`,
      status: "completed",
      executedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[Temporal:executeDraft] Error:", err);
    throw err;
  }
}
