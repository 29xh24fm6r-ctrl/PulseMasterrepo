import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { JOB_HANDLERS, JobRow } from "@/lib/jobs/handlers";
import { jobEvent } from "@/lib/jobs/events";
import {
  startJobC8,
  completeJobC8,
  extractProvider,
  computeAdaptiveDelay,
} from "@/lib/jobs/complete";

type RunOneJobArgs = {
  userId: string;        // Supabase UUID (public.users.id)
  lockedBy: string;      // instance identifier
  lockSeconds?: number;  // default 300
};

function backoffSeconds(attempts: number) {
  // 1m, 2m, 3m... capped at 10m
  return Math.min(Math.max(1, attempts) * 60, 600);
}

function isRetryableError(err: unknown): boolean {
  const msg = err instanceof Error ? (err.message || "") : String(err);
  const s = msg.toLowerCase();
  return (
    s.includes("timeout") ||
    s.includes("etimedout") ||
    s.includes("econnreset") ||
    s.includes("rate limit") ||
    s.includes("429") ||
    s.includes("temporarily")
  );
}

export async function runOneJob({ userId, lockedBy, lockSeconds = 300 }: RunOneJobArgs) {
  // Use C7 leasing function for per-user job leasing (priority-aware, cost-aware, burst-priced)
  const { data, error: leaseErr } = await supabaseAdmin.rpc("job_queue_lease_any_c7", {
    p_user_id: userId,
    p_worker_id: lockedBy,
  });

  if (leaseErr) {
    return { ok: false, ran: false, error: `Lease failed: ${leaseErr.message}` };
  }

  const leased = (data ?? [])[0] ?? null;
  if (!leased) {
    return { ok: true, ran: false, message: "No queued jobs ready" };
  }

  // C7 returns: job_id, kind, payload, lane, cost
  // We need to fetch the full job row for the handler
  const { data: jobData, error: jobErr } = await supabaseAdmin
    .from("job_queue")
    .select("*")
    .eq("id", leased.job_id)
    .single();

  if (jobErr || !jobData) {
    return { ok: false, ran: false, error: `Failed to load leased job: ${jobErr?.message ?? "not found"}` };
  }

  const job = jobData as JobRow;

  // Extract provider for telemetry (C10)
  const provider = extractProvider(job.payload, job.job_type);

  // Log lease event with C7 cost information
  await jobEvent(job.id, "info", "leased", {
    job_type: job.job_type,
    locked_by: lockedBy,
    cost: leased.cost,
    lane: leased.lane,
    kind: leased.kind,
    provider: provider ?? undefined,
  });

  // Step 2: Start job (canonical C8 loop)
  await startJobC8(job.id, lockedBy);

  const handler = JOB_HANDLERS[job.job_type];
  if (!handler) {
    await jobEvent(job.id, "error", "no_handler", {
      job_type: job.job_type,
      provider: provider ?? undefined,
    });

    // Use C8 completion for no-handler case (failed)
    await completeJobC8({
      jobId: job.id,
      workerId: lockedBy,
      outcome: "failed",
      error: `No handler registered for job_type=${job.job_type}`,
      meta: {
        job_type: job.job_type,
        kind: leased.kind,
        lane: leased.lane,
        cost: leased.cost,
        provider: provider ?? undefined,
        event: "failed",
      },
    });

    return { ok: false, ran: true, job_id: job.id, job_type: job.job_type, error: "NO_HANDLER" };
  }

  // Step 3: Execute handler
  try {
    const result = await handler({ job, supabaseAdmin });

    // Step 4: Complete job (success)
    await completeJobC8({
      jobId: job.id,
      workerId: lockedBy,
      outcome: "succeeded",
      output: result ?? null,
      meta: {
        kind: leased.kind,
        lane: leased.lane,
        cost: leased.cost,
        provider: provider ?? undefined,
        event: "completed",
      },
    });

    await jobEvent(job.id, "info", "succeeded", {
      provider: provider ?? undefined,
      event: "completed",
    });

    return { ok: true, ran: true, job_id: job.id, job_type: job.job_type, result };
  } catch (err) {
    const retry = isRetryableError(err);
    const errorMsg = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? (err.stack ?? err.message) : String(err);

    // Compute adaptive delay if retry (C10)
    let delaySeconds = backoffSeconds((job.attempts ?? 0) + 1);
    if (retry && provider) {
      delaySeconds = await computeAdaptiveDelay(provider, delaySeconds, 3600);
    }

    // Step 4: Complete job (error/retry)
    // Note: C8 RPC handles requeue scheduling, but we log the adaptive delay for telemetry
    await completeJobC8({
      jobId: job.id,
      workerId: lockedBy,
      outcome: retry ? "retry" : "failed",
      error: errorStack,
      meta: {
        kind: leased.kind,
        lane: leased.lane,
        cost: leased.cost,
        retryable: retry,
        provider: provider ?? undefined,
        event: retry ? "retry" : "failed",
        delay_seconds: retry ? delaySeconds : undefined,
        base_delay_seconds: retry ? backoffSeconds((job.attempts ?? 0) + 1) : undefined,
      },
    });

    await jobEvent(job.id, retry ? "warn" : "error", retry ? "retry" : "failed", {
      error: errorMsg,
      retryable: retry,
      provider: provider ?? undefined,
      event: retry ? "retry" : "failed",
      delay_seconds: retry ? delaySeconds : undefined,
      base_delay_seconds: retry ? backoffSeconds((job.attempts ?? 0) + 1) : undefined,
    });

    return {
      ok: false,
      ran: true,
      job_id: job.id,
      job_type: job.job_type,
      error: errorMsg,
      retrying: retry,
    };
  }
}

export async function runOneJobAny({
  lockedBy,
  lockSeconds = 300,
  maxRunningPerUser,
  defaultDailyBudget,
  windowSeconds,
  windowLimit,
  laneQuotaInteractive,
  laneQuotaDefault,
  laneQuotaCron,
  starvationSeconds,
  starvationBoost,
}: {
  lockedBy: string;
  lockSeconds?: number;
  maxRunningPerUser?: number;
  defaultDailyBudget?: number;
  windowSeconds?: number;
  windowLimit?: number;
  laneQuotaInteractive?: number;
  laneQuotaDefault?: number;
  laneQuotaCron?: number;
  starvationSeconds?: number;
  starvationBoost?: number;
}) {
  const budget = defaultDailyBudget ?? parseInt(process.env.PULSE_DAILY_BUDGET_DEFAULT || "100", 10);
  const maxRunning = maxRunningPerUser ?? parseInt(process.env.PULSE_MAX_RUNNING_PER_USER || "3", 10);
  const winSeconds = windowSeconds ?? parseInt(process.env.PULSE_RATE_WINDOW_SECONDS || "3600", 10);
  const winLimit = windowLimit ?? parseInt(process.env.PULSE_RATE_WINDOW_LIMIT || "30", 10);
  const quotaInteractive = laneQuotaInteractive ?? parseInt(process.env.PULSE_LANE_QUOTA_INTERACTIVE || "60", 10);
  const quotaDefault = laneQuotaDefault ?? parseInt(process.env.PULSE_LANE_QUOTA_DEFAULT || "30", 10);
  const quotaCron = laneQuotaCron ?? parseInt(process.env.PULSE_LANE_QUOTA_CRON || "10", 10);
  const starveSec = starvationSeconds ?? parseInt(process.env.PULSE_STARVATION_SECONDS || "600", 10);
  const starveBoost = starvationBoost ?? parseInt(process.env.PULSE_STARVATION_BOOST || "50", 10);

  // Use C6 leasing function (requires user_id and worker_id)
  // For global leasing, we need to determine which user to lease for
  // C6 is per-user, so we'll need to adapt this or use a different approach
  // For now, keeping C5 but adding a note that C6 should be used per-user
  const { data: leased, error: leaseErr } = await supabaseAdmin.rpc("job_queue_lease_any_c5", {
    p_locked_by: lockedBy,
    p_lock_seconds: lockSeconds,
    p_max_running_per_user: maxRunning,
    p_default_daily_budget: budget,
    p_window_seconds: winSeconds,
    p_window_limit: winLimit,
    p_lane_quota_interactive: quotaInteractive,
    p_lane_quota_default: quotaDefault,
    p_lane_quota_cron: quotaCron,
    p_starvation_seconds: starveSec,
    p_starvation_boost: starveBoost,
  });

  if (leaseErr) {
    return { ok: false, ran: false, error: `LeaseAny failed: ${leaseErr.message}` };
  }

  const job = (leased?.[0] as JobRow | undefined) ?? null;
  if (!job) {
    return { ok: true, ran: false, message: "No queued jobs ready" };
  }

  await jobEvent(job.id, "info", "leased_any", { job_type: job.job_type, locked_by: lockedBy });

  const handler = JOB_HANDLERS[job.job_type];
  if (!handler) {
    await jobEvent(job.id, "error", "no_handler", { job_type: job.job_type });

    await supabaseAdmin
      .from("job_queue")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        last_error: `No handler registered for job_type=${job.job_type}`,
        locked_at: null,
        locked_by: null,
        attempts: (job.attempts ?? 0) + 1,
      })
      .eq("id", job.id);

    return { ok: false, ran: true, job_id: job.id, job_type: job.job_type, error: "NO_HANDLER" };
  }

  try {
    await jobEvent(job.id, "info", "started");
    const result = await handler({ job, supabaseAdmin });

    await supabaseAdmin
      .from("job_queue")
      .update({
        status: "succeeded",
        finished_at: new Date().toISOString(),
        last_error: null,
        locked_at: null,
        locked_by: null,
      })
      .eq("id", job.id);

    await jobEvent(job.id, "info", "succeeded");

    return { ok: true, ran: true, job_id: job.id, job_type: job.job_type, user_id: job.user_id, result };
  } catch (e: any) {
    const msg = e?.message || String(e);
    const nextAttempts = (job.attempts ?? 0) + 1;

    const shouldRetry = nextAttempts < (job.max_attempts ?? 3);
    const nextRunAt = new Date(Date.now() + Math.min(Math.max(1, nextAttempts) * 60, 600) * 1000).toISOString();

    await supabaseAdmin
      .from("job_queue")
      .update({
        status: shouldRetry ? "queued" : "failed",
        run_at: shouldRetry ? nextRunAt : job.run_at,
        finished_at: new Date().toISOString(),
        last_error: msg,
        locked_at: null,
        locked_by: null,
        attempts: nextAttempts,
      })
      .eq("id", job.id);

    await jobEvent(job.id, "error", "failed", { error: msg, retrying: shouldRetry, next_run_at: shouldRetry ? nextRunAt : null });

    return {
      ok: false,
      ran: true,
      job_id: job.id,
      job_type: job.job_type,
      user_id: job.user_id,
      error: msg,
      retrying: shouldRetry,
      next_run_at: shouldRetry ? nextRunAt : null,
    };
  }
}
