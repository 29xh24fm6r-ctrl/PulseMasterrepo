// lib/automation/engine.ts
// Sprint 4: Autopilot Engine v2 (detectors → suggestions → actions)
import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createLogger } from "@/lib/obs/log";
import { MAX_ACTIONS_PER_RUN } from "@/lib/jobs/safety";
import type { DetectorResult, Suggestion, AutomationPolicy } from "./types";

const logger = createLogger({ source: "automation_engine" });

/**
 * Run autopilot scan for a user
 * 
 * Pipeline:
 * 1. Detector scans sources
 * 2. Suggestion generator produces proposed actions
 * 3. Policy gate filters what is allowed
 * 4. Store suggestions as automation_actions (status: 'suggested')
 */
export async function runAutopilotScan(
  userId: string,
  policyId?: string
): Promise<{
  run_id: string;
  sources_scanned: number;
  suggestions_count: number;
  actions_created: number;
}> {
  const runLogger = logger.child({ user_id: userId, policy_id: policyId });

  // Create automation run record
  const { data: run, error: runError } = await supabaseAdmin
    .from("automation_runs")
    .insert({
      user_id: userId,
      policy_id: policyId || null,
      run_type: "detector",
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (runError || !run) {
    runLogger.error("Failed to create automation run", runError);
    throw new Error("Failed to create automation run");
  }

  try {
    // Step 1: Run detectors
    const detectorResults = await runDetectors(userId, runLogger);
    const sourcesScanned = detectorResults.length;

    // Step 2: Generate suggestions
    const suggestions = await generateSuggestions(detectorResults, userId, runLogger);
    const suggestionsCount = suggestions.length;

    // Step 3: Apply policy gate
    const policies = await getActivePolicies(userId, policyId);
    let allowedSuggestions = await applyPolicyGate(suggestions, policies, userId, runLogger);

    // Safety: Limit actions per run
    if (allowedSuggestions.length > MAX_ACTIONS_PER_RUN) {
      runLogger.warn("Actions limited by safety throttle", {
        requested: allowedSuggestions.length,
        limit: MAX_ACTIONS_PER_RUN,
      });
      allowedSuggestions = allowedSuggestions.slice(0, MAX_ACTIONS_PER_RUN);
    }

    // Step 4: Store as automation_actions (status: 'suggested')
    const actionsCreated = await storeSuggestionsAsActions(
      allowedSuggestions,
      userId,
      policyId,
      run.id,
      runLogger
    );

    // Update run record
    await supabaseAdmin
      .from("automation_runs")
      .update({
        status: "succeeded",
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - new Date(run.started_at).getTime(),
        sources_scanned: { count: sourcesScanned },
        suggestions_count: suggestionsCount,
        actions_executed_count: actionsCreated,
      })
      .eq("id", run.id);

    runLogger.info("Autopilot scan completed", {
      run_id: run.id,
      sources_scanned: sourcesScanned,
      suggestions_count: suggestionsCount,
      actions_created: actionsCreated,
    });

    return {
      run_id: run.id,
      sources_scanned: sourcesScanned,
      suggestions_count: suggestionsCount,
      actions_created: actionsCreated,
    };
  } catch (err: any) {
    runLogger.error("Autopilot scan failed", err);

    await supabaseAdmin
      .from("automation_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_message: err.message,
      })
      .eq("id", run.id);

    throw err;
  }
}

/**
 * Step 1: Run detectors
 */
async function runDetectors(
  userId: string,
  runLogger: ReturnType<typeof createLogger>
): Promise<DetectorResult[]> {
  const results: DetectorResult[] = [];

  // Email detector: needs response
  try {
    const { getNeedsResponseThreads } = await import("@/lib/email/needsResponse");
    const threads = await getNeedsResponseThreads({ clerkUserId: userId, limit: 25 });
    
    if (threads.length > 0) {
      results.push({
        source: "email",
        entity_type: "email_thread",
        entity_id: null,
        signals: threads.map((t) => ({
          type: "needs_response",
          severity: "medium" as const,
          data: { thread_id: t.threadId, subject: t.subject },
        })),
      });
    }
  } catch (err: any) {
    runLogger.warn("Email detector failed", { error: err.message });
  }

  // Task detector: overdue tasks
  try {
    const { data: overdueTasks } = await supabaseAdmin
      .from("tasks")
      .select("id, title, due_date")
      .eq("user_id", userId)
      .eq("status", "open")
      .lt("due_date", new Date().toISOString().split("T")[0]);

    if (overdueTasks && overdueTasks.length > 0) {
      results.push({
        source: "tasks",
        entity_type: "task",
        entity_id: null,
        signals: overdueTasks.map((t) => ({
          type: "overdue",
          severity: "high" as const,
          data: { task_id: t.id, title: t.title, due_date: t.due_date },
        })),
      });
    }
  } catch (err: any) {
    runLogger.warn("Task detector failed", { error: err.message });
  }

  // Deal detector: stale deals
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: staleDeals } = await supabaseAdmin
      .from("deals")
      .select("id, name, stage, updated_at")
      .eq("user_id", userId)
      .not("stage", "eq", "closed")
      .lt("updated_at", thirtyDaysAgo.toISOString());

    if (staleDeals && staleDeals.length > 0) {
      results.push({
        source: "deals",
        entity_type: "deal",
        entity_id: null,
        signals: staleDeals.map((d) => ({
          type: "stale",
          severity: "medium" as const,
          data: { deal_id: d.id, name: d.name, stage: d.stage },
        })),
      });
    }
  } catch (err: any) {
    runLogger.warn("Deal detector failed", { error: err.message });
  }

  return results;
}

/**
 * Step 2: Generate suggestions from detector results
 */
async function generateSuggestions(
  detectorResults: DetectorResult[],
  userId: string,
  runLogger: ReturnType<typeof createLogger>
): Promise<Suggestion[]> {
  const suggestions: Suggestion[] = [];

  for (const result of detectorResults) {
    for (const signal of result.signals) {
      if (signal.type === "needs_response" && result.source === "email") {
        suggestions.push({
          action_type: "create_task",
          payload: {
            title: `Reply: ${signal.data.subject}`,
            notes: `Email thread needs response: ${signal.data.thread_id}`,
            priority: 1, // High
            due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0], // Tomorrow
          },
          reason: "Email thread needs response",
          confidence: 0.9,
          risk_flags: [],
        });
      } else if (signal.type === "overdue" && result.source === "tasks") {
        suggestions.push({
          action_type: "complete_task",
          payload: {
            task_id: signal.data.task_id,
          },
          reason: "Task is overdue",
          confidence: 0.7,
          risk_flags: ["auto-complete may not be desired"],
        });
      } else if (signal.type === "stale" && result.source === "deals") {
        suggestions.push({
          action_type: "nudge_deal",
          payload: {
            deal_id: signal.data.deal_id,
            message: "Deal hasn't been updated in 30+ days",
          },
          reason: "Deal is stale and needs attention",
          confidence: 0.8,
          risk_flags: [],
        });
      }
    }
  }

  return suggestions;
}

/**
 * Step 3: Apply policy gate
 */
async function applyPolicyGate(
  suggestions: Suggestion[],
  policies: AutomationPolicy[],
  userId: string,
  runLogger: ReturnType<typeof createLogger>
): Promise<Suggestion[]> {
  if (policies.length === 0) {
    // No policies = no automation allowed (safe default)
    runLogger.info("No active policies, all suggestions filtered");
    return [];
  }

  const allowed: Suggestion[] = [];

  for (const suggestion of suggestions) {
    let isAllowed = false;

    for (const policy of policies) {
      // Check scope
      const scopeMatch = policy.scopes.some((scope) => {
        if (scope === "email" && suggestion.action_type === "create_task") return true;
        if (scope === "tasks" && ["create_task", "complete_task"].includes(suggestion.action_type)) return true;
        if (scope === "deals" && suggestion.action_type === "nudge_deal") return true;
        return false;
      });

      if (!scopeMatch) continue;

      // Check allowlist
      const allowlist = policy.allowlist_rules?.action_types || [];
      if (allowlist.length > 0 && !allowlist.includes(suggestion.action_type)) {
        continue;
      }

      // Check denylist
      const denylist = policy.denylist_rules?.action_types || [];
      if (denylist.includes(suggestion.action_type)) {
        continue;
      }

      // Check safety constraints
      if (policy.safety_constraints?.never_send_email && suggestion.action_type === "send_email") {
        continue;
      }

      // Check daily limit
      const today = new Date().toISOString().split("T")[0];
      const { count } = await supabaseAdmin
        .from("automation_actions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("policy_id", policy.id)
        .eq("status", "executed")
        .gte("executed_at", `${today}T00:00:00Z`);

      if ((count || 0) >= policy.max_actions_per_day) {
        runLogger.warn("Policy daily limit reached", { policy_id: policy.id, count });
        continue;
      }

      isAllowed = true;
      break;
    }

    if (isAllowed) {
      allowed.push(suggestion);
    }
  }

  return allowed;
}

/**
 * Step 4: Store suggestions as automation_actions
 */
async function storeSuggestionsAsActions(
  suggestions: Suggestion[],
  userId: string,
  policyId: string | undefined,
  runId: string,
  runLogger: ReturnType<typeof createLogger>
): Promise<number> {
  if (suggestions.length === 0) return 0;

  const correlationId = crypto.randomUUID();

  const actions = suggestions.map((s) => ({
    user_id: userId,
    policy_id: policyId || null,
    action_type: s.action_type,
    action_payload: s.payload,
    status: "suggested" as const,
    approved_by_user: false,
    idempotency_key: `${s.action_type}:${JSON.stringify(s.payload)}`,
    correlation_id: correlationId,
  }));

  const { data, error } = await supabaseAdmin
    .from("automation_actions")
    .insert(actions)
    .select("id");

  if (error) {
    runLogger.error("Failed to store suggestions", error);
    throw new Error(`Failed to store suggestions: ${error.message}`);
  }

  return data?.length || 0;
}

/**
 * Get active policies for user
 */
async function getActivePolicies(
  userId: string,
  specificPolicyId?: string
): Promise<AutomationPolicy[]> {
  let query = supabaseAdmin
    .from("automation_policies")
    .select("*")
    .eq("user_id", userId)
    .eq("enabled", true);

  if (specificPolicyId) {
    query = query.eq("id", specificPolicyId);
  }

  const { data, error } = await query;

  if (error) {
    logger.error("Failed to fetch policies", error, { user_id: userId });
    return [];
  }

  return (data || []) as AutomationPolicy[];
}

