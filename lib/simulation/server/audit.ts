// lib/simulation/server/audit.ts
import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

export interface SimulationRunAudit {
  userId: string;
  requestId: string;
  route: string;
  mode: string;
  dealId: string | null;
  pathIds: string[] | null;
  input: Record<string, any>;
}

export interface SimulationRunAuditUpdate {
  status: "finished" | "failed";
  finishedAt: string;
  durationMs: number;
  error?: string | null;
  result?: any | null;
}

/**
 * Insert audit record when simulation starts
 */
export async function auditSimulationStart(audit: SimulationRunAudit): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", audit.userId)
    .maybeSingle();

  const dbUserId = userRow?.id || audit.userId;

  const { data, error } = await supabaseAdmin
    .from("simulation_runs")
    .insert({
      user_id: dbUserId,
      request_id: audit.requestId,
      route: audit.route,
      mode: audit.mode,
      deal_id: audit.dealId,
      path_ids: audit.pathIds,
      input: audit.input,
      status: "started",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to audit simulation start: ${error?.message || "Unknown error"}`);
  }

  return data.id;
}

/**
 * Update audit record when simulation finishes
 */
export async function auditSimulationFinish(
  auditId: string,
  update: SimulationRunAuditUpdate
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("simulation_runs")
    .update({
      status: update.status,
      finished_at: update.finishedAt,
      duration_ms: update.durationMs,
      error: update.error || null,
      result: update.result || null,
    })
    .eq("id", auditId);

  if (error) {
    throw new Error(`Failed to audit simulation finish: ${error.message}`);
  }
}

