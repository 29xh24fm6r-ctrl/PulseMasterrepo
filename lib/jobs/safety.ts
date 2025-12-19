// lib/jobs/safety.ts
// Sprint 4: Safety throttles and loop prevention
import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createLogger } from "@/lib/obs/log";

const logger = createLogger({ source: "job_safety" });

/**
 * Check if user has exceeded daily job limit
 */
export async function checkDailyJobLimit(
  userId: string,
  jobType: string,
  maxPerDay: number = 100
): Promise<{ allowed: boolean; count: number; limit: number }> {
  const today = new Date().toISOString().split("T")[0];

  const { count, error } = await supabaseAdmin
    .from("job_queue")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("job_type", jobType)
    .gte("created_at", `${today}T00:00:00Z`);

  if (error) {
    logger.error("Failed to check daily job limit", error, { user_id: userId, job_type: jobType });
    // Fail open (allow) if check fails
    return { allowed: true, count: 0, limit: maxPerDay };
  }

  const currentCount = count || 0;
  const allowed = currentCount < maxPerDay;

  if (!allowed) {
    logger.warn("Daily job limit exceeded", {
      user_id: userId,
      job_type: jobType,
      count: currentCount,
      limit: maxPerDay,
    });
  }

  return { allowed, count: currentCount, limit: maxPerDay };
}

/**
 * Check if action is idempotent (prevent duplicate execution)
 */
export async function checkIdempotency(
  userId: string,
  actionType: string,
  idempotencyKey: string
): Promise<{ isDuplicate: boolean; existingId?: string }> {
  // Check job_queue for succeeded jobs with same key
  const { data: existingJob } = await supabaseAdmin
    .from("job_queue")
    .select("id")
    .eq("user_id", userId)
    .eq("job_type", actionType)
    .eq("idempotency_key", idempotencyKey)
    .eq("status", "succeeded")
    .single();

  if (existingJob) {
    return { isDuplicate: true, existingId: existingJob.id };
  }

  // Check automation_actions for executed actions with same key
  const { data: existingAction } = await supabaseAdmin
    .from("automation_actions")
    .select("id")
    .eq("user_id", userId)
    .eq("action_type", actionType)
    .eq("idempotency_key", idempotencyKey)
    .eq("status", "executed")
    .single();

  if (existingAction) {
    return { isDuplicate: true, existingId: existingAction.id };
  }

  return { isDuplicate: false };
}

/**
 * Check if same action was executed recently (prevent loops)
 */
export async function checkRecentAction(
  userId: string,
  actionType: string,
  payloadHash: string,
  windowHours: number = 24
): Promise<{ tooRecent: boolean; lastExecutedAt?: string }> {
  const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

  const { data: recent } = await supabaseAdmin
    .from("automation_actions")
    .select("executed_at")
    .eq("user_id", userId)
    .eq("action_type", actionType)
    .eq("idempotency_key", payloadHash)
    .eq("status", "executed")
    .gte("executed_at", windowStart)
    .order("executed_at", { ascending: false })
    .limit(1)
    .single();

  if (recent) {
    logger.warn("Action executed too recently", {
      user_id: userId,
      action_type: actionType,
      last_executed_at: recent.executed_at,
      window_hours: windowHours,
    });
    return { tooRecent: true, lastExecutedAt: recent.executed_at };
  }

  return { tooRecent: false };
}

/**
 * Global throttle: Max jobs claimed per tick
 */
export const MAX_JOBS_PER_TICK = 50;

/**
 * Global throttle: Max actions executed per run
 */
export const MAX_ACTIONS_PER_RUN = 20;

