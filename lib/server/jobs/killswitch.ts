// lib/server/jobs/killswitch.ts
// Job system kill switch
import "server-only";

/**
 * Check if jobs are enabled
 * 
 * Returns false if JOBS_ENABLED env var is not "true"
 */
export function isJobsEnabled(): boolean {
  return process.env.JOBS_ENABLED === "true";
}

/**
 * Throw error if jobs are disabled
 */
export function requireJobsEnabled(): void {
  if (!isJobsEnabled()) {
    throw new Error("Jobs are disabled (JOBS_ENABLED != true)");
  }
}

