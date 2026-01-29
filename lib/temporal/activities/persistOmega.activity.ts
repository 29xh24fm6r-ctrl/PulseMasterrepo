// lib/temporal/activities/persistOmega.activity.ts
// Activity that persists Omega workflow state to database

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

/**
 * Persist Omega workflow state to the database
 * Uses upsert with session_id for idempotency
 * This creates a workflow-level envelope that's useful for operational dashboards
 */
export async function persistOmegaActivity(state: OmegaState): Promise<void> {
  try {
    const { error } = await supabaseAdmin().from("pulse_omega_runs").upsert(
      {
        user_id: state.userId,
        session_id: state.sessionId,
        started_at: state.startedAt,
        approved: state.approved,
        auto_executed: state.shouldAutoExecute,
        intent: state.intent,
        draft: state.draft,
        guardian_review: state.guardianReview,
        errors: state.errors,
        reasoning_steps: state.reasoningTrace?.length || 0,
        total_duration_ms: state.reasoningTrace?.reduce((sum, s) => sum + s.durationMs, 0) || 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    );

    if (error) {
      console.error("[Temporal:persistOmega] Failed to upsert:", error);
      throw error;
    }
  } catch (err) {
    console.error("[Temporal:persistOmega] Error:", err);
    throw err;
  }
}
