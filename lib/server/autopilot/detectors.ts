// lib/server/autopilot/detectors.ts
// Autopilot detectors (pure functions returning normalized suggestions)
import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createLogger } from "@/lib/obs/log";

const logger = createLogger({ source: "autopilot_detectors" });

/**
 * Normalized detector suggestion
 */
export type DetectorSuggestion = {
  suggestion_type: string;
  title: string;
  detail: string;
  priority: "low" | "medium" | "high";
  entity_type?: string;
  entity_id?: string;
  idempotency_key: string;
  metadata?: Record<string, any>;
};

/**
 * Detector function signature
 */
export type DetectorFunction = (
  userId: string,
  policyId: string,
  triggerConditions: Record<string, any>
) => Promise<DetectorSuggestion[]>;

/**
 * Overdue tasks detector
 */
export async function detectOverdueTasks(
  userId: string,
  policyId: string,
  triggerConditions: Record<string, any>
): Promise<DetectorSuggestion[]> {
  const suggestions: DetectorSuggestion[] = [];
  
  const overdueDays = triggerConditions.overdue_days || 1;
  const maxResults = triggerConditions.max_results || 10;
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - overdueDays);
  
  const { data: overdueTasks, error } = await supabaseAdmin
    .from("tasks")
    .select("id, title, due_date, priority")
    .eq("user_id", userId)
    .eq("status", "pending")
    .lt("due_date", cutoffDate.toISOString())
    .order("due_date", { ascending: true })
    .limit(maxResults);

  if (error) {
    logger.warn("Failed to fetch overdue tasks", { error, user_id: userId });
    return suggestions;
  }

  if (!overdueTasks || overdueTasks.length === 0) {
    return suggestions;
  }

  for (const task of overdueTasks) {
    const daysOverdue = Math.floor(
      (Date.now() - new Date(task.due_date).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Generate stable idempotency key: autopilot:overdue_tasks:POLICY_ID:task:TASK_ID:overdue>3d
    const bucket = `overdue>${overdueDays}d`;
    const idempotencyKey = `autopilot:overdue_tasks:${policyId}:task:${task.id}:${bucket}`;
    
    suggestions.push({
      suggestion_type: "prioritize_task",
      title: `Task "${task.title}" is ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue`,
      detail: `Due date: ${new Date(task.due_date).toLocaleDateString()}. Consider prioritizing this task.`,
      priority: daysOverdue > 7 ? "high" : daysOverdue > 3 ? "medium" : "low",
      entity_type: "task",
      entity_id: task.id,
      idempotency_key: idempotencyKey,
      metadata: {
        task_id: task.id,
        task_title: task.title,
        due_date: task.due_date,
        current_priority: task.priority,
        days_overdue: daysOverdue,
      },
    });
  }

  return suggestions;
}

/**
 * Stale deals detector
 */
export async function detectStaleDeals(
  userId: string,
  policyId: string,
  triggerConditions: Record<string, any>
): Promise<DetectorSuggestion[]> {
  const suggestions: DetectorSuggestion[] = [];
  
  const staleDays = triggerConditions.stale_days || 7;
  const maxResults = triggerConditions.max_results || 10;
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - staleDays);
  
  const { data: staleDeals, error } = await supabaseAdmin
    .from("deals")
    .select("id, title, status, updated_at")
    .eq("user_id", userId)
    .in("status", ["active", "negotiating"])
    .lt("updated_at", cutoffDate.toISOString())
    .order("updated_at", { ascending: true })
    .limit(maxResults);

  if (error) {
    logger.warn("Failed to fetch stale deals", { error, user_id: userId });
    return suggestions;
  }

  if (!staleDeals || staleDeals.length === 0) {
    return suggestions;
  }

  for (const deal of staleDeals) {
    const daysStale = Math.floor(
      (Date.now() - new Date(deal.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Generate stable idempotency key: autopilot:stale_deals:POLICY_ID:deal:DEAL_ID:stale>14d
    const bucket = `stale>${staleDays}d`;
    const idempotencyKey = `autopilot:stale_deals:${policyId}:deal:${deal.id}:${bucket}`;
    
    suggestions.push({
      suggestion_type: "nudge_deal",
      title: `Deal "${deal.title}" has no activity in ${daysStale} day${daysStale !== 1 ? "s" : ""}`,
      detail: `Last activity: ${new Date(deal.updated_at).toLocaleDateString()}. Consider adding a next step or following up.`,
      priority: daysStale > 14 ? "high" : daysStale > 7 ? "medium" : "low",
      entity_type: "deal",
      entity_id: deal.id,
      idempotency_key: idempotencyKey,
      metadata: {
        deal_id: deal.id,
        deal_title: deal.title,
        last_activity: deal.updated_at,
        days_stale: daysStale,
      },
    });
  }

  return suggestions;
}

/**
 * Detector registry
 */
export const detectors: Record<string, DetectorFunction> = {
  overdue_tasks: detectOverdueTasks,
  stale_deals: detectStaleDeals,
};

