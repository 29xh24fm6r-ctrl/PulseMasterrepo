// lib/server/jobs/execute.ts
// Job execution logic
import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { nextScheduledAt } from "./backoff";
import { jobHandlers } from "./registry";
import type { JobQueueRow, JobExecutionResult } from "./types";

/**
 * Execute a single job
 * 
 * Flow:
 * 1. Load job by id
 * 2. Verify status = 'running'
 * 3. Create job_runs row
 * 4. Execute job handler
 * 5. Update job_queue and job_runs based on result
 */
export async function executeJob(jobId: string): Promise<JobExecutionResult> {
  // Load job
  const { data: job, error: fetchError } = await supabaseAdmin
    .from("job_queue")
    .select("*")
    .eq("id", jobId)
    .eq("status", "running")
    .single();

  if (fetchError || !job) {
    throw new Error("Job not found or not running");
  }

  const startTime = Date.now();

  // Create job run record
  const { data: run, error: runError } = await supabaseAdmin
    .from("job_runs")
    .insert({
      job_id: job.id,
      user_id: job.user_id,
      job_type: job.job_type,
      status: "running",
      started_at: new Date().toISOString(),
      metadata: { worker_id: "api-worker" },
    })
    .select("*")
    .single();

  if (runError) {
    throw new Error(`Failed to create job run: ${runError.message}`);
  }

  try {
    // Get handler
    const handler = jobHandlers[job.job_type];
    if (!handler) {
      throw new Error(`No handler for job type: ${job.job_type}`);
    }

    // Execute handler
    const result = await handler(job);

    const duration = Date.now() - startTime;

    // Mark job as succeeded
    await supabaseAdmin
      .from("job_queue")
      .update({
        status: "succeeded",
        finished_at: new Date().toISOString(),
        result: result || {},
      })
      .eq("id", job.id);

    // Update job run
    await supabaseAdmin
      .from("job_runs")
      .update({
        status: "succeeded",
        finished_at: new Date().toISOString(),
        duration_ms: duration,
        result: result || {},
      })
      .eq("id", run.id);

    return {
      success: true,
      result: result || {},
    };
  } catch (execError: any) {
    const duration = Date.now() - startTime;
    const errorMessage = execError.message || "Job execution failed";
    const errorStack = execError.stack || null;

    // Check if we should retry or dead-letter
    const shouldRetry = job.attempts < job.max_attempts;

    if (shouldRetry) {
      // Requeue with backoff
      await supabaseAdmin
        .from("job_queue")
        .update({
          status: "queued",
          scheduled_at: nextScheduledAt(job.attempts),
          last_error: errorMessage,
        })
        .eq("id", job.id);
    } else {
      // Dead-letter
      await supabaseAdmin
        .from("job_queue")
        .update({
          status: "dead_letter",
          finished_at: new Date().toISOString(),
          last_error: errorMessage,
        })
        .eq("id", job.id);
    }

    // Update job run
    await supabaseAdmin
      .from("job_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        duration_ms: duration,
        error_message: errorMessage,
        error_stack: errorStack,
      })
      .eq("id", run.id);

    return {
      success: false,
      error: errorMessage,
      errorStack,
    };
  }
}

