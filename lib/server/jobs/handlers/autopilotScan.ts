// lib/server/jobs/handlers/autopilotScan.ts
// Autopilot scan job handler (suggest-only, DB-aligned, bulletproof)

import "server-only";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createLogger } from "@/lib/obs/log";
import type { JobQueueRow } from "../types";

const logger = createLogger({ source: "autopilot_scan" });

type PluginAutomation = {
  id: string;
  owner_user_id?: string | null; // preferred ownership field in your schema
  user_id: string;              // text (often Clerk user id)
  name: string;
  description?: string | null;
  trigger_event: string;
  trigger_conditions: Record<string, any> | null;
  action_type: string;
  action_config: Record<string, any>;
  is_active: boolean;
};

type DetectorSuggestion = {
  suggestion_type: string;
  title: string;
  detail: string;
  priority: "low" | "medium" | "high";
  entity_type?: string;
  entity_id?: string;
  idempotency_key: string;
  metadata?: Record<string, any>;
  policy_id?: string;
};

function todayISODateUTC() {
  return new Date().toISOString().slice(0, 10);
}

function buildCorrelationId(job: JobQueueRow) {
  return job.correlation_id || crypto.randomUUID();
}

/**
 * Execute autopilot.scan job
 *
 * DB-aligned Flow:
 * 1) Resolve identity (supabase user uuid + clerk id)
 * 2) Create life_arc_autopilot_runs row
 * 3) Load active autopilot policies from plugin_automations
 * 4) Run detectors based on policy config
 * 5) Insert life_arc_autopilot_suggestions with strict idempotency + lifecycle safety
 * 6) Audit log
 * 7) Mark run success
 */
export async function handleAutopilotScan(job: JobQueueRow): Promise<Record<string, any>> {
  const supabaseUserId = job.user_id; // uuid
  const payload = job.payload || {};
  const scopes: string[] = payload.scopes || ["tasks", "deals"];
  const correlationId = buildCorrelationId(job);

  // IMPORTANT: plugin_automations.user_id is text (likely Clerk user id).
  // We require a clerkUserId in payload or on job row, otherwise we can't policy-gate safely.
  const clerkUserId: string | null =
    payload.owner_user_id ||
    payload.clerk_user_id ||
    (job as any).owner_user_id ||
    null;

  logger.info("Starting autopilot scan", {
    supabase_user_id: supabaseUserId,
    clerk_user_id: clerkUserId,
    scopes,
    correlation_id: correlationId,
  });

  // DEBUG: Log user identities for troubleshooting
  console.log("AUTOPILOT SCAN HANDLER", { supabaseUserId, clerkUserId, correlationId });

  if (!clerkUserId) {
    // Bulletproof: do not run without ownership identity.
    // This prevents "global scans" or wrong-user policy loads.
    logger.warn("Missing clerk user id; refusing to scan", { supabaseUserId, correlationId });
    return { skipped: true, reason: "missing_clerk_user_id", suggestions_created: 0 };
  }

  // 1) Create run record
  const runDate = todayISODateUTC();
  const { data: run, error: runError } = await supabaseAdmin
    .from("life_arc_autopilot_runs")
    .insert({
      user_id: supabaseUserId,
      owner_user_id: clerkUserId,
      run_type: "autopilot_scan",
      run_date: runDate,
      status: "success", // we'll overwrite if something fails
      details: {
        correlation_id: correlationId,
        scopes,
        started_at: new Date().toISOString(),
      },
    })
    .select("*")
    .single();

  if (runError || !run) {
    throw new Error(`Failed to create autopilot run: ${runError?.message || "Unknown error"}`);
  }

  // 2) Load policies from plugin_automations (Autopilot conventions)
  // DEBUG: Log what we're searching for
  console.log("AUTOPILOT SCAN: Loading policies", {
    clerkUserId,
    trigger_event: "autopilot.scan",
    action_type: "suggest",
    is_active: true,
  });

  const { data: policies, error: policiesError } = await supabaseAdmin
    .from("plugin_automations")
    .select("*")
    // owner_user_id is the safest ownership join if present
    .eq("owner_user_id", clerkUserId)
    .eq("trigger_event", "autopilot.scan")
    .eq("action_type", "suggest")
    .eq("is_active", true);

  // DEBUG: Log policy search results
  console.log("AUTOPILOT SCAN: Policies found", {
    count: policies?.length || 0,
    policies: policies?.map((p) => ({ id: p.id, name: p.name, owner_user_id: p.owner_user_id })),
    error: policiesError?.message,
  });

  if (policiesError) {
    await finalizeRunFailure(run.id, run.details, {
      error: policiesError.message,
      correlation_id: correlationId,
      phase: "load_policies",
    });
    throw new Error(`Failed to load autopilot policies: ${policiesError.message}`);
  }

  // Bulletproof safe default: no policies => skip
  if (!policies || policies.length === 0) {
    console.log("AUTOPILOT SCAN: No active policies found - skipping scan");
    await supabaseAdmin
      .from("life_arc_autopilot_runs")
      .update({
        status: "success",
        details: {
          ...(run.details || {}),
          finished_at: new Date().toISOString(),
          skipped_reason: "no_active_policies",
          policies_loaded: 0,
          suggestions_created: 0,
        },
      })
      .eq("id", run.id);

    await logAuditEvent({
      user_id: supabaseUserId,
      source: "autopilot",
      event_type: "run_completed",
      entity_type: "life_arc_autopilot_run",
      entity_id: run.id,
      payload: { skipped: true, reason: "no_active_policies" },
      correlation_id: correlationId,
    });

    return { skipped: true, reason: "no_active_policies", suggestions_created: 0 };
  }

  // 3) Run detectors according to scopes + policy configs
  const normalizedPolicies = policies as unknown as PluginAutomation[];

  const suggestions: DetectorSuggestion[] = [];

  if (scopes.includes("tasks")) {
    suggestions.push(...(await detectOverdueTasks(supabaseUserId, clerkUserId, normalizedPolicies)));
  }

  if (scopes.includes("deals")) {
    suggestions.push(...(await detectStaleDeals(supabaseUserId, clerkUserId, normalizedPolicies)));
  }

  // 4) Insert suggestions with idempotency + lifecycle safety
  let insertedCount = 0;
  let dedupedCount = 0;
  let reopenedFromSnoozeCount = 0;

  for (const s of suggestions) {
    const res = await insertSuggestionBulletproof({
      supabaseUserId,
      clerkUserId,
      runId: run.id,
      suggestion: s,
      correlationId,
    });

    if (res.inserted) insertedCount++;
    if (res.duplicate) dedupedCount++;
    if (res.reopenedFromSnooze) reopenedFromSnoozeCount++;
  }

  // 5) Update run + audit
  await supabaseAdmin
    .from("life_arc_autopilot_runs")
    .update({
      status: "success",
      details: {
        ...(run.details || {}),
        finished_at: new Date().toISOString(),
        policies_loaded: normalizedPolicies.length,
        suggestions_total: suggestions.length,
        suggestions_created: insertedCount,
        suggestions_deduped: dedupedCount,
        suggestions_reopened_from_snooze: reopenedFromSnoozeCount,
      },
    })
    .eq("id", run.id);

  await logAuditEvent({
    user_id: supabaseUserId,
    source: "autopilot",
    event_type: "run_completed",
    entity_type: "life_arc_autopilot_run",
    entity_id: run.id,
    payload: {
      policies_loaded: normalizedPolicies.length,
      scopes,
      suggestions_total: suggestions.length,
      suggestions_created: insertedCount,
      suggestions_deduped: dedupedCount,
      suggestions_reopened_from_snooze: reopenedFromSnoozeCount,
    },
    correlation_id: correlationId,
  });

  logger.info("Autopilot scan completed", {
    supabase_user_id: supabaseUserId,
    clerk_user_id: clerkUserId,
    run_id: run.id,
    suggestions_created: insertedCount,
    suggestions_deduped: dedupedCount,
    reopenedFromSnoozeCount,
  });

  // DEBUG: Log final results
  console.log("AUTOPILOT SCAN: Completed", {
    run_id: run.id,
    suggestions_total: suggestions.length,
    suggestions_created: insertedCount,
    suggestions_deduped: dedupedCount,
    suggestions_reopened_from_snooze: reopenedFromSnoozeCount,
    policies_loaded: normalizedPolicies.length,
  });

  return {
    run_id: run.id,
    suggestions_total: suggestions.length,
    suggestions_created: insertedCount,
    suggestions_deduped: dedupedCount,
    suggestions_reopened_from_snooze: reopenedFromSnoozeCount,
    policies_loaded: normalizedPolicies.length,
    scopes,
  };
}

/** -------------------- Detector: Overdue Tasks -------------------- */
async function detectOverdueTasks(
  supabaseUserId: string,
  clerkUserId: string,
  policies: PluginAutomation[]
): Promise<DetectorSuggestion[]> {
  // Policy selection: action_config.detector === 'overdue_tasks'
  const relevantPolicies = policies.filter((p) => p.action_config?.detector === "overdue_tasks");
  if (relevantPolicies.length === 0) return [];

  // Use the "tightest" max_results / overdue_days across active policies (bulletproof deterministic)
  const overdueDays = Math.max(
    1,
    ...relevantPolicies.map((p) => Number(p.trigger_conditions?.overdue_days ?? 1))
  );

  const maxResults = Math.min(
    50,
    ...relevantPolicies.map((p) => Number(p.trigger_conditions?.max_results ?? 25))
  );

  const cutoff = new Date(Date.now() - overdueDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: overdueTasks, error } = await supabaseAdmin
    .from("tasks")
    .select("id, title, due_date, priority, status")
    .eq("user_id", supabaseUserId)
    .eq("status", "pending")
    .lt("due_date", cutoff)
    .order("due_date", { ascending: true })
    .limit(maxResults);

  if (error) {
    logger.warn("Failed to fetch overdue tasks", { error, supabaseUserId });
    return [];
  }
  if (!overdueTasks || overdueTasks.length === 0) return [];

  // Pick one policy to attribute (first match). You can later expand to per-policy outputs.
  const policy = relevantPolicies[0];
  const bucket = `overdue>${overdueDays}d`;

  return overdueTasks.map((t: any) => ({
    suggestion_type: "overdue_tasks",
    title: `Overdue task: ${t.title}`,
    detail: `Task "${t.title}" is overdue by at least ${overdueDays} day(s). Due: ${t.due_date}`,
    priority: "high",
    entity_type: "task",
    entity_id: String(t.id),
    idempotency_key: `autopilot:overdue_tasks:${policy.id}:task:${t.id}:${bucket}`,
    metadata: {
      detector: "overdue_tasks",
      overdue_days: overdueDays,
      task: { id: t.id, title: t.title, due_date: t.due_date, priority: t.priority },
      owner_user_id: clerkUserId,
    },
    policy_id: policy.id,
  }));
}

/** -------------------- Detector: Stale Deals -------------------- */
async function detectStaleDeals(
  supabaseUserId: string,
  clerkUserId: string,
  policies: PluginAutomation[]
): Promise<DetectorSuggestion[]> {
  const relevantPolicies = policies.filter((p) => p.action_config?.detector === "stale_deals");
  if (relevantPolicies.length === 0) return [];

  const staleDays = Math.max(
    1,
    ...relevantPolicies.map((p) => Number(p.trigger_conditions?.stale_days ?? 7))
  );

  const maxResults = Math.min(
    50,
    ...relevantPolicies.map((p) => Number(p.trigger_conditions?.max_results ?? 25))
  );

  const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: staleDeals, error } = await supabaseAdmin
    .from("deals")
    .select("id, title, status, updated_at")
    .eq("user_id", supabaseUserId)
    .in("status", ["active", "negotiating"])
    .lt("updated_at", cutoff)
    .order("updated_at", { ascending: true })
    .limit(maxResults);

  if (error) {
    logger.warn("Failed to fetch stale deals", { error, supabaseUserId });
    return [];
  }
  if (!staleDeals || staleDeals.length === 0) return [];

  const policy = relevantPolicies[0];
  const bucket = `stale>${staleDays}d`;

  return staleDeals.map((d: any) => ({
    suggestion_type: "stale_deals",
    title: `Stale deal: ${d.title}`,
    detail: `Deal "${d.title}" has had no activity for at least ${staleDays} day(s). Last update: ${d.updated_at}`,
    priority: "medium",
    entity_type: "deal",
    entity_id: String(d.id),
    idempotency_key: `autopilot:stale_deals:${policy.id}:deal:${d.id}:${bucket}`,
    metadata: {
      detector: "stale_deals",
      stale_days: staleDays,
      deal: { id: d.id, title: d.title, status: d.status, updated_at: d.updated_at },
      owner_user_id: clerkUserId,
    },
    policy_id: policy.id,
  }));
}

/** -------------------- Bulletproof insert w/ lifecycle safety -------------------- */
async function insertSuggestionBulletproof(args: {
  supabaseUserId: string;
  clerkUserId: string;
  runId: string;
  suggestion: DetectorSuggestion;
  correlationId: string;
}): Promise<{ inserted: boolean; duplicate: boolean; reopenedFromSnooze: boolean }> {
  const { supabaseUserId, clerkUserId, runId, suggestion, correlationId } = args;

  // 1) Try insert. If duplicate key, we handle lifecycle.
  const insert = await supabaseAdmin.from("life_arc_autopilot_suggestions").insert({
    user_id: supabaseUserId,
    owner_user_id: clerkUserId,
    policy_id: suggestion.policy_id || null,
    run_id: runId,
    suggestion_type: suggestion.suggestion_type,
    title: suggestion.title,
    detail: suggestion.detail,
    priority: suggestion.priority,
    entity_type: suggestion.entity_type || null,
    entity_id: suggestion.entity_id || null,
    status: "open",
    snoozed_until: null,
    idempotency_key: suggestion.idempotency_key,
    metadata: suggestion.metadata || {},
  });

  if (!insert.error) {
    await logAuditEvent({
      user_id: supabaseUserId,
      source: "autopilot",
      event_type: "suggestion_created",
      entity_type: "life_arc_autopilot_suggestion",
      entity_id: undefined,
      payload: {
        suggestion_type: suggestion.suggestion_type,
        idempotency_key: suggestion.idempotency_key,
      },
      correlation_id: correlationId,
    });
    return { inserted: true, duplicate: false, reopenedFromSnooze: false };
  }

  // Unique violation => dedupe path
  if ((insert.error as any).code === "23505") {
    // 2) Fetch existing row to enforce lifecycle rules
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("life_arc_autopilot_suggestions")
      .select("id, status, snoozed_until")
      .eq("user_id", supabaseUserId)
      .eq("idempotency_key", suggestion.idempotency_key)
      .maybeSingle();

    if (existingError || !existing) {
      // If we can't load it, do not attempt to resurrect anything (bulletproof conservative)
      logger.warn("Duplicate suggestion but failed to load existing row", {
        error: existingError,
        idempotency_key: suggestion.idempotency_key,
      });
      return { inserted: false, duplicate: true, reopenedFromSnooze: false };
    }

    // Dismissed stays dismissed
    if (existing.status === "dismissed") {
      return { inserted: false, duplicate: true, reopenedFromSnooze: false };
    }

    // Snoozed stays snoozed until expired; if expired, reopen
    if (existing.status === "snoozed") {
      const until = existing.snoozed_until ? new Date(existing.snoozed_until).getTime() : 0;
      const now = Date.now();

      if (until && now < until) {
        return { inserted: false, duplicate: true, reopenedFromSnooze: false };
      }

      // Snooze expired -> reopen
      const { error: reopenError } = await supabaseAdmin
        .from("life_arc_autopilot_suggestions")
        .update({ status: "open", snoozed_until: null })
        .eq("id", existing.id)
        .eq("user_id", supabaseUserId);

      if (!reopenError) {
        await logAuditEvent({
          user_id: supabaseUserId,
          source: "autopilot",
          event_type: "suggestion_reopened",
          entity_type: "life_arc_autopilot_suggestion",
          entity_id: existing.id,
          payload: { idempotency_key: suggestion.idempotency_key },
          correlation_id: correlationId,
        });
        return { inserted: false, duplicate: true, reopenedFromSnooze: true };
      }
    }

    return { inserted: false, duplicate: true, reopenedFromSnooze: false };
  }

  // Any other error should be logged but not crash the entire scan
  logger.warn("Failed to insert suggestion (non-unique error)", {
    error: insert.error,
    idempotency_key: suggestion.idempotency_key,
  });

  return { inserted: false, duplicate: false, reopenedFromSnooze: false };
}

/** -------------------- Run failure finalizer -------------------- */
async function finalizeRunFailure(runId: string, runDetails: any, extra: Record<string, any>) {
  await supabaseAdmin
    .from("life_arc_autopilot_runs")
    .update({
      status: "failed",
      details: { ...(runDetails || {}), failed_at: new Date().toISOString(), ...extra },
    })
    .eq("id", runId);
}

/** -------------------- Audit log helper -------------------- */
async function logAuditEvent(params: {
  user_id: string;
  source: string;
  event_type: string;
  entity_type?: string;
  entity_id?: string;
  payload?: Record<string, any>;
  correlation_id?: string;
}): Promise<void> {
  try {
    await supabaseAdmin.from("audit_log").insert({
      user_id: params.user_id,
      source: params.source,
      event_type: params.event_type,
      entity_type: params.entity_type || null,
      entity_id: params.entity_id || null,
      action: params.event_type, // keep backward compatibility if your audit_log still uses action
      payload: params.payload || {},
      correlation_id: params.correlation_id || null,
    });
  } catch (err: any) {
    logger.warn("Failed to write audit log", { error: err, params });
  }
}
