// AGI Orchestrator - Chief of Staff Entry Point
// lib/agi/orchestrator.ts

import { AGITriggerContext, AGIRunResult } from "./types";
import { runAGIKernel } from "./kernel";
import { logAGIRunToDB, logAGIActionsToDB } from "./persistence";
import { executeActions } from "./executor";
import { supabaseAdmin } from "@/lib/supabase";
import { getAGIUserProfile, isActionAllowedByProfile } from "./settings";

export interface OrchestratorOptions {
  force?: boolean; // bypass some rate limits for manual runs
}

/**
 * Resolve Clerk ID to database user ID
 */
async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

/**
 * Handle AGI event - single entry point for all Pulse systems
 */
export async function handleAGIEvent(
  userId: string,
  trigger: AGITriggerContext,
  opts: OrchestratorOptions = {}
): Promise<AGIRunResult | null> {
  const dbUserId = await resolveUserId(userId);

  // 1) Load user AGI settings
  const { data: settings } = await supabaseAdmin
    .from("user_agi_settings")
    .select("*")
    .eq("user_id", dbUserId)
    .maybeSingle();

  // Default settings if none exist
  const agiLevel = settings?.level || "assist";
  const maxActionsPerRun = settings?.max_actions_per_run || 10;
  const maxRunsPerDay = settings?.max_runs_per_day || 12;
  const requireConfirmationForHighImpact = settings?.require_confirmation_for_high_impact ?? true;

  // 2) Enforce level gating
  if (agiLevel === "off" && !opts.force) {
    return null; // Silently skip if AGI is disabled
  }

  // 3) Enforce daily run limit
  if (!opts.force) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayRuns } = await supabaseAdmin
      .from("agi_runs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", dbUserId)
      .gte("started_at", today.toISOString());

    if ((todayRuns || 0) >= maxRunsPerDay) {
      console.log(`[AGI Orchestrator] Daily run limit reached for user ${userId}`);
      return null;
    }
  }

  // 4) Policy-based gating (simple type matching for v1)
  const { data: policies } = await supabaseAdmin
    .from("agi_policies")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("enabled", true);

  if (policies && policies.length > 0 && !opts.force) {
    // Check if any policy matches this trigger type
    const matchingPolicy = policies.find((p) => {
      const policyTrigger = p.trigger as any;
      return policyTrigger?.type === trigger.type;
    });

    // If policies exist but none match, skip (unless force)
    if (!matchingPolicy) {
      console.log(`[AGI Orchestrator] No matching policy for trigger type ${trigger.type}`);
      return null;
    }
  }

  // 5) Run AGI kernel
  let run: AGIRunResult;
  try {
    run = await runAGIKernel(userId, trigger);
  } catch (err: any) {
    // If kernel throws (e.g., AGI disabled), return null
    if (err.message?.includes("disabled")) {
      return null;
    }
    throw err;
  }

  // 7) Persist run and actions
  const runId = await logAGIRunToDB(run);
  if (runId) {
    await logAGIActionsToDB(userId, runId, run.finalPlan);
  }

  // 8) Execute actions (low-risk only, autopilot only, and respecting profile)
  // HARD SAFETY RULE: Only execute in autopilot mode, and only low-risk actions that pass profile checks
  if (agiLevel === "autopilot") {
    const lowRiskActions = run.finalPlan.filter(
      (a) => a.riskLevel === "low" && !a.requiresConfirmation
    );

    // Filter by profile capabilities and hard limits
    const allowedActions = lowRiskActions.filter((a) => isActionAllowedByProfile(profile, a));

    if (allowedActions.length > 0) {
      if (process.env.NODE_ENV === "development") {
        console.log(
          `[AGI Orchestrator] Auto-executing ${allowedActions.length} low-risk action(s) in autopilot mode (${lowRiskActions.length - allowedActions.length} blocked by profile)`
        );
      }
      await executeActions(userId, allowedActions, profile, settings, runId || undefined);
    } else {
      if (process.env.NODE_ENV === "development") {
        console.log(
          `[AGI Orchestrator] No allowed actions to auto-execute (${lowRiskActions.length} low-risk actions blocked by profile capabilities/hard limits)`
        );
      }
    }
  } else {
    // For "assist" level, actions remain in "planned" status for user review
    if (process.env.NODE_ENV === "development") {
      console.log(`[AGI Orchestrator] Assist mode: ${run.finalPlan.length} action(s) logged as planned (not executed)`);
    }
  }

  return run;
}

