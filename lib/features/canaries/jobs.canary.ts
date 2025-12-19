// lib/features/canaries/jobs.canary.ts
import "server-only";
import type { CanaryFn, CanaryContext, CanaryResult } from "../canary.types";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hintMissingTable, hintRlsDenied } from "../canary/hints";

export const jobsCanary: CanaryFn = async (ctx: CanaryContext): Promise<CanaryResult> => {
  const checks: CanaryResult["checks"] = [];
  const featureId = "scheduler-admin";

  // Check 1: Job queue table exists
  try {
    const { error } = await supabaseAdmin.from("job_queue").select("id").limit(1);
    const tableOk = !error;
    const isMissingTable = error?.code === "42P01" || error?.message?.includes("does not exist");
    checks.push({
      id: "db_table_exists",
      label: "Job queue table accessible",
      ok: tableOk,
      details: tableOk ? "job_queue table exists and is queryable" : error?.message,
      fixHint: tableOk ? undefined : isMissingTable ? hintMissingTable("job_queue") : hintRlsDenied("job_queue"),
    });
  } catch (err: any) {
    checks.push({
      id: "db_table_exists",
      label: "Job queue table accessible",
      ok: false,
      details: err?.message || "Failed to query job_queue table",
      fixHint: hintMissingTable("job_queue"),
    });
  }

  // Check 2: Job runs table exists
  try {
    const { error } = await supabaseAdmin.from("job_runs").select("id").limit(1);
    const runsOk = !error;
    const isMissingTable = error?.code === "42P01" || error?.message?.includes("does not exist");
    checks.push({
      id: "runs_table_exists",
      label: "Job runs table accessible",
      ok: runsOk,
      details: runsOk ? "job_runs table exists and is queryable" : error?.message,
      fixHint: runsOk ? undefined : isMissingTable ? hintMissingTable("job_runs") : hintRlsDenied("job_runs"),
    });
  } catch (err: any) {
    checks.push({
      id: "runs_table_exists",
      label: "Job runs table accessible",
      ok: false,
      details: err?.message || "Failed to query job_runs table",
      fixHint: hintMissingTable("job_runs"),
    });
  }

  // Check 3: Can query recent job status
  try {
    const { data, error } = await supabaseAdmin
      .from("job_queue")
      .select("id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(1);
    const queryOk = !error;
    checks.push({
      id: "job_queue_query",
      label: "Job queue queryable",
      ok: queryOk,
      details: queryOk ? `Can query job queue (${data?.length || 0} recent jobs)` : error?.message,
      fixHint: queryOk ? undefined : hintRlsDenied("job_queue"),
    });
  } catch (err: any) {
    checks.push({
      id: "job_queue_query",
      label: "Job queue queryable",
      ok: false,
      details: err?.message || "Failed to query job queue",
      fixHint: hintRlsDenied("job_queue"),
    });
  }

  const ok = checks.every((c) => c.ok);
  const severity = ok ? "ok" : checks.some((c) => !c.ok) ? "fail" : "warn";
  return {
    featureId,
    ok,
    severity,
    checks,
    createdAt: new Date().toISOString(),
    message: ok ? "All checks passed" : `${checks.filter((c) => !c.ok).length} check(s) failed`,
  };
};

