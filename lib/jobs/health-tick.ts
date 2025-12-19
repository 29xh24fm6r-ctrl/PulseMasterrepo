import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Run the scheduler health tick
 * This includes:
 * - Computing job queue health snapshot
 * - Running SLA escalation
 * - Running provider health tick (C10)
 */
export async function runSchedulerHealthTick(): Promise<{
  ok: boolean;
  error?: string;
  healthSnapshot?: boolean;
  slaEscalation?: boolean;
  providerHealth?: boolean;
}> {
  try {
    // Compute health snapshot
    const { error: healthErr } = await supabaseAdmin.rpc("compute_job_queue_health", {
      p_window_seconds: 300,
    });
    if (healthErr) {
      return {
        ok: false,
        error: `Health snapshot failed: ${healthErr.message}`,
      };
    }

    // Run SLA escalation (Option A: inside health tick)
    const { error: escalateErr } = await supabaseAdmin.rpc("job_queue_sla_escalate_c9", {
      p_priority_bump: 50,
      p_lane_when_breached: "fast",
    });
    if (escalateErr) {
      // Log but don't fail - escalation is optional
      console.warn("SLA escalation failed:", escalateErr.message);
    }

    // Provider health tick (C10)
    const { error: providerErr } = await supabaseAdmin.rpc("job_provider_health_tick_c10", {
      p_window_minutes: 60,
      p_degraded_threshold: 0.10,
      p_outage_threshold: 0.30,
    });
    if (providerErr) {
      // Log but don't fail - provider health is optional
      console.warn("Provider health tick failed:", providerErr.message);
    }

    return {
      ok: true,
      healthSnapshot: true,
      slaEscalation: !escalateErr,
      providerHealth: !providerErr,
    };
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message ?? String(e),
    };
  }
}

