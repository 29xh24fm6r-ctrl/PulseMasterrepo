// lib/server/jobs/claim.ts
// Atomic job claiming
import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { JobQueueRow } from "./types";

/**
 * Claim jobs atomically from the queue
 * 
 * Claims up to `limit` jobs that are:
 * - status = 'queued'
 * - scheduled_at <= now()
 * 
 * Uses atomic UPDATE to prevent double-claiming
 */
export async function claimJobs(limit: number = 10): Promise<JobQueueRow[]> {
  // Try RPC first (most reliable with row locking)
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
    throw new Error(`Failed to claim jobs: ${error.message}`);
  }

  return (jobs || []) as JobQueueRow[];
}

/**
 * Manual job claiming (fallback if RPC doesn't exist)
 * 
 * Note: This is not fully atomic but uses status check to prevent double-claim
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

  // Claim each job individually (with status check to prevent race conditions)
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

