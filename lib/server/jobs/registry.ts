// lib/server/jobs/registry.ts
// Job handler registry
import "server-only";
import type { JobQueueRow } from "./types";
import { handleAutopilotScan } from "./handlers/autopilotScan";

/**
 * Job handler function signature
 */
export type JobHandler = (job: JobQueueRow) => Promise<Record<string, any>>;

/**
 * Job handler registry
 * 
 * Maps job_type to handler function
 */
export const jobHandlers: Record<string, JobHandler> = {
  "agent.run": async (job) => {
    // NOTE: Agent run handler deferred to future sprint
    // Agents framework exists (agents, agent_findings, agent_reports tables)
    // but execution handler not yet implemented
    return { 
      skipped: true, 
      message: "Agent run handler not yet implemented - deferred to future sprint" 
    };
  },

  "autopilot.scan": handleAutopilotScan,
};

/**
 * Register a job handler
 */
export function registerJobHandler(jobType: string, handler: JobHandler): void {
  jobHandlers[jobType] = handler;
}

