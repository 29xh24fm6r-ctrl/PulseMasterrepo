import "server-only";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdmin();

    // Counts by status
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

    // Oldest queued job
    const { data: oldestQueued, error: oldestErr } = await supabaseAdmin
      .from("job_queue")
      .select("id,user_id,job_type,lane,priority,run_at,created_at,cost")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const oldestAgeSeconds = oldestQueued
      ? Math.floor((Date.now() - new Date(oldestQueued.created_at).getTime()) / 1000)
      : null;

    // Stuck running jobs (locked_at > 10 minutes ago)
    const { data: stuckRunning, error: stuckErr } = await supabaseAdmin
      .from("job_queue")
      .select("id,user_id,job_type,locked_at,started_at")
      .eq("status", "running")
      .lt("locked_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .limit(20);

    // Budget exhaustion - filter in memory
    const today = new Date().toISOString().split("T")[0];
    const { data: allBudgets, error: budgetErr } = await supabaseAdmin
      .from("job_queue_daily_budget")
      .select("user_id,spent,budget")
      .eq("day", today)
      .limit(100);
    const budgetExhausted = (allBudgets ?? []).filter((b: any) => b.spent >= b.budget).slice(0, 50);

    // Rate window exhaustion (current window) - filter in memory
    const windowSeconds = 3600;
    const windowStartEpoch = Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds;
    const windowStart = new Date(windowStartEpoch * 1000).toISOString();

    const { data: allRateWindows, error: rateErr } = await supabaseAdmin
      .from("job_queue_rate_window")
      .select("user_id,spent,limit")
      .eq("window_start", windowStart)
      .eq("window_seconds", windowSeconds)
      .limit(100);
    const rateWindowExhausted = (allRateWindows ?? []).filter((rw: any) => rw.spent >= rw.limit).slice(0, 50);

    // Lane quota exhaustion - filter in memory
    const { data: allLaneQuotas, error: laneErr } = await supabaseAdmin
      .from("job_queue_lane_quota")
      .select("user_id,lane,spent,quota")
      .eq("day", today)
      .limit(200);
    const laneQuotaExhausted = (allLaneQuotas ?? []).filter((lq: any) => lq.spent >= lq.quota).slice(0, 50);

    // Starvation watchlist (queued jobs older than 10 minutes)
    const { data: starvingJobs, error: starveErr } = await supabaseAdmin
      .from("job_queue")
      .select("id,user_id,job_type,lane,priority,run_at,created_at,cost")
      .eq("status", "queued")
      .lt("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .order("created_at", { ascending: true })
      .limit(20);

    return NextResponse.json({
      ok: true,
      counts: {
        queued: queuedCount ?? 0,
        running: runningCount ?? 0,
        succeeded: succeededCount ?? 0,
        failed: failedCount ?? 0,
      },
      oldest_queued: oldestQueued,
      oldest_age_seconds: oldestAgeSeconds,
      stuck_running: stuckRunning ?? [],
      budget_exhausted: budgetExhausted,
      rate_window_exhausted: rateWindowExhausted,
      lane_quota_exhausted: laneQuotaExhausted,
      starving_jobs: starvingJobs ?? [],
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: e?.status ?? 500 }
    );
  }
}

