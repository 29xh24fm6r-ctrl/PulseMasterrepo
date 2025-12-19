import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runAutopilotScan } from "@/lib/autopilot/scan";
import { rebuildContactIntel } from "@/lib/intel/rebuildContact";

export type JobRow = {
  id: string;
  user_id: string;
  job_type: string;
  status: string;
  run_at: string;
  priority: number;
  payload: any;
  attempts: number;
  max_attempts: number;
  correlation_id?: string | null;
  idempotency_key?: string | null;
};

export type JobHandlerCtx = {
  job: JobRow;
  supabaseAdmin: typeof supabaseAdmin;
};

export type JobHandler = (ctx: JobHandlerCtx) => Promise<any>;

export const JOB_HANDLERS: Record<string, JobHandler> = {
  "autopilot.scan": async ({ job }) => runAutopilotScan(job),
  "intel.rebuild_contact": async ({ job }) => rebuildContactIntel(job),
};
