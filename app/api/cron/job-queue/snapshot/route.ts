import "server-only";
import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/auth/requireCronSecret";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    requireCronSecret(req);

    // Counts by status
    const { data: statusCounts, error: statusErr } = await supabaseAdmin
      .from("job_queue")
      .select("status")
      .then((q) => {
        // Group by status in memory (Supabase doesn't have native aggregation)
        return q;
      });

    // Get counts via RPC or multiple queries
    const { count: queuedCount } = await supabaseAdmin
      .from("job_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "queued");

    const { count: runningCount } = await supabaseAdmin
      .from("job_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "running");

    const { count: succeededCount } = await supabaseAdmin
      .from("job_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "succeeded");

    const { count: failedCount } = await supabaseAdmin
      .from("job_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "failed");

    // Top 10 oldest queued jobs
    const { data: oldestQueued, error: oldestErr } = await supabaseAdmin
      .from("job_queue")
      .select("id,user_id,job_type,lane,priority,run_at,created_at")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(10);

    // Jobs stuck running (locked_at > 10 minutes ago)
    const { count: stuckRunningCount } = await supabaseAdmin
      .from("job_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "running")
      .lt("locked_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

    // Budget exhaustion (spent >= budget)
    const today = new Date().toISOString().split("T")[0];
    const { data: budgetExhausted, error: budgetErr } = await supabaseAdmin
      .from("job_queue_daily_budget")
      .select("user_id,spent,budget")
      .eq("day", today)
      .gte("spent", supabaseAdmin.raw("budget"));

    // Rate window exhaustion (current window)
    const windowSeconds = 3600;
    const windowStartEpoch = Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds;
    const windowStart = new Date(windowStartEpoch * 1000).toISOString();

    const { data: rateWindowExhausted, error: rateErr } = await supabaseAdmin
      .from("job_queue_rate_window")
      .select("user_id,spent,limit")
      .eq("window_start", windowStart)
      .eq("window_seconds", windowSeconds)
      .gte("spent", supabaseAdmin.raw("limit"));

    // Lane quota exhaustion
    const { data: laneQuotaExhausted, error: laneErr } = await supabaseAdmin
      .from("job_queue_lane_quota")
      .select("user_id,lane,spent,quota")
      .eq("day", today)
      .gte("spent", supabaseAdmin.raw("quota"));

    return NextResponse.json({
      ok: true,
      counts: {
        queued: queuedCount ?? 0,
        running: runningCount ?? 0,
        succeeded: succeededCount ?? 0,
        failed: failedCount ?? 0,
      },
      oldest_queued: oldestQueued ?? [],
      stuck_running_count: stuckRunningCount ?? 0,
      budget_exhausted_count: budgetExhausted.length,
      rate_window_exhausted_count: rateWindowExhausted.length,
      lane_quota_exhausted_count: laneQuotaExhausted.length,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: e?.status ?? 500 }
    );
  }
}

