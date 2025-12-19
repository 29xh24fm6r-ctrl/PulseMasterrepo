// lib/jobs/queue.ts
// Sprint 4: Job queue operations
import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createLogger } from "@/lib/obs/log";
import type { CreateJobInput, JobQueueRow } from "./types";

const logger = createLogger({ source: "job_queue" });

/**
 * Create a new job in the queue
 * 
 * Returns the created job, or existing job if idempotency_key matches
 */
export async function enqueueJob(input: CreateJobInput): Promise<JobQueueRow> {
  const { user_id, job_type, payload = {}, scheduled_at, idempotency_key, correlation_id, max_attempts = 3 } = input;

  // Check for existing job with same idempotency_key (if provided)
  if (idempotency_key) {
    const { data: existing } = await supabaseAdmin
      .from("job_queue")
      .select("*")
      .eq("user_id", user_id)
      .eq("job_type", job_type)
      .eq("idempotency_key", idempotency_key)
      .eq("status", "succeeded")
      .single();

    if (existing) {
      logger.info("Job already succeeded with same idempotency_key", {
        user_id,
        job_type,
        idempotency_key,
        existing_job_id: existing.id,
      });
      return existing as JobQueueRow;
    }
  }

  const { data: job, error } = await supabaseAdmin
    .from("job_queue")
    .insert({
      user_id,
      job_type,
      payload,
      scheduled_at: scheduled_at || new Date().toISOString(),
      idempotency_key: idempotency_key || null,
      correlation_id: correlation_id || null,
      max_attempts,
      status: "queued",
    })
    .select("*")
    .single();

  if (error) {
    logger.error("Failed to enqueue job", error, { user_id, job_type, idempotency_key });
    throw new Error(`Failed to enqueue job: ${error.message}`);
  }

  logger.info("Job enqueued", { user_id, job_type, job_id: job.id, idempotency_key });
  return job as JobQueueRow;
}

/**
 * Claim jobs for execution (row locking pattern)
 * 
 * Claims up to `limit` jobs that are queued and scheduled
 */
export async function claimJobs(limit: number = 10): Promise<JobQueueRow[]> {
  // Use row-level locking to claim jobs atomically
  // This query updates status to 'running' and returns claimed jobs
  const { data: jobs, error } = await supabaseAdmin
    .rpc("claim_jobs", { claim_limit: limit })
    .then((result) => {
      // If RPC doesn't exist, fall back to manual claim
      if (result.error && result.error.code === "42883") {
        return claimJobsManual(limit);
      }
      return result;
    });

  if (error && error.code !== "42883") {
    logger.error("Failed to claim jobs", error);
    throw new Error(`Failed to claim jobs: ${error.message}`);
  }

  return (jobs || []) as JobQueueRow[];
}

/**
 * Manual job claiming (fallback if RPC doesn't exist)
 */
async function claimJobsManual(limit: number): Promise<{ data: JobQueueRow[] | null; error: any }> {
  // Get claimable jobs
  const { data: claimable, error: selectError } = await supabaseAdmin
    .from("job_queue")
    .select("*")
    .eq("status", "queued")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  if (selectError || !claimable || claimable.length === 0) {
    return { data: [], error: selectError };
  }

  // Claim each job individually (with retry logic for race conditions)
  const claimed: JobQueueRow[] = [];
  for (const job of claimable) {
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("job_queue")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
        attempts: job.attempts + 1,
      })
      .eq("id", job.id)
      .eq("status", "queued") // Only update if still queued (prevents double-claim)
      .select("*")
      .single();

    if (!updateError && updated) {
      claimed.push(updated as JobQueueRow);
    }
  }

  return { data: claimed, error: null };
}

/**
 * Mark job as succeeded
 */
export async function markJobSucceeded(
  jobId: string,
  result?: Record<string, any>
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("job_queue")
    .update({
      status: "succeeded",
      finished_at: new Date().toISOString(),
      result: result || null,
    })
    .eq("id", jobId);

  if (error) {
    logger.error("Failed to mark job as succeeded", error, { job_id: jobId });
    throw new Error(`Failed to mark job as succeeded: ${error.message}`);
  }
}

/**
 * Mark job as failed
 */
export async function markJobFailed(
  jobId: string,
  errorMessage: string,
  errorStack?: string
): Promise<void> {
  const job = await supabaseAdmin
    .from("job_queue")
    .select("attempts, max_attempts")
    .eq("id", jobId)
    .single();

  const finalStatus = job.data && job.data.attempts >= job.data.max_attempts 
    ? "failed" // Dead-letter after max attempts
    : "queued"; // Retry if under max attempts

  const { error } = await supabaseAdmin
    .from("job_queue")
    .update({
      status: finalStatus,
      finished_at: finalStatus === "failed" ? new Date().toISOString() : null,
      last_error: errorMessage,
      scheduled_at: finalStatus === "queued" 
        ? new Date(Date.now() + Math.pow(2, job.data?.attempts || 0) * 1000).toISOString() // Exponential backoff
        : undefined,
    })
    .eq("id", jobId);

  if (error) {
    logger.error("Failed to mark job as failed", error, { job_id: jobId });
    throw new Error(`Failed to mark job as failed: ${error.message}`);
  }

  // Create job run record
  await supabaseAdmin.from("job_runs").insert({
    job_id: jobId,
    user_id: job.data?.user_id || "",
    job_type: job.data?.job_type || "unknown",
    status: "failed",
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    error_message: errorMessage,
    error_stack: errorStack || null,
  });
}

