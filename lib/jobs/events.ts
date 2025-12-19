// lib/jobs/events.ts
// Job event logging helper
import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function jobEvent(
  jobId: string,
  level: "info" | "warn" | "error",
  message: string,
  meta: Record<string, any> = {}
) {
  // Never let logging crash the worker
  try {
    await supabaseAdmin.from("job_queue_events").insert({
      job_id: jobId,
      level,
      message,
      meta,
    });
  } catch {
    // ignore
  }
}

