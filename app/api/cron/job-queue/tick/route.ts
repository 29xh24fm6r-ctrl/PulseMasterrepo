import "server-only";
import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/auth/requireCronSecret";
import { runOneJobAny } from "@/lib/jobs/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    requireCronSecret(req);

    const url = new URL(req.url);
    const n = Math.min(parseInt(url.searchParams.get("n") || "10", 10) || 10, 50);
    const ms = parseInt(url.searchParams.get("ms") || "8000", 10) || 8000;
    const maxRunningPerUser = url.searchParams.get("max_running_per_user") ? parseInt(url.searchParams.get("max_running_per_user")!, 10) : undefined;
    const windowSeconds = url.searchParams.get("window_seconds") ? parseInt(url.searchParams.get("window_seconds")!, 10) : undefined;
    const windowLimit = url.searchParams.get("window_limit") ? parseInt(url.searchParams.get("window_limit")!, 10) : undefined;
    const laneQuotaInteractive = url.searchParams.get("lane_quota_interactive") ? parseInt(url.searchParams.get("lane_quota_interactive")!, 10) : undefined;
    const laneQuotaDefault = url.searchParams.get("lane_quota_default") ? parseInt(url.searchParams.get("lane_quota_default")!, 10) : undefined;
    const laneQuotaCron = url.searchParams.get("lane_quota_cron") ? parseInt(url.searchParams.get("lane_quota_cron")!, 10) : undefined;
    const starvationSeconds = url.searchParams.get("starvation_seconds") ? parseInt(url.searchParams.get("starvation_seconds")!, 10) : undefined;
    const starvationBoost = url.searchParams.get("starvation_boost") ? parseInt(url.searchParams.get("starvation_boost")!, 10) : undefined;

    const lockedBy =
      process.env.VERCEL_REGION
        ? `cron:${process.env.VERCEL_REGION}`
        : `cron:local:${process.pid}`;

    const startTime = Date.now();
    const results: any[] = [];
    let stoppedReason = "completed";

    for (let i = 0; i < n; i++) {
      // Check time budget
      const elapsed = Date.now() - startTime;
      if (elapsed >= ms) {
        stoppedReason = "time_budget_exceeded";
        break;
      }

      const r = await runOneJobAny({
        lockedBy,
        lockSeconds: 300,
        maxRunningPerUser,
        windowSeconds,
        windowLimit,
        laneQuotaInteractive,
        laneQuotaDefault,
        laneQuotaCron,
        starvationSeconds,
        starvationBoost,
      });
      results.push(r);

      if (!r.ran) {
        stoppedReason = "no_jobs_available";
        break;
      }
    }

    const elapsedMs = Date.now() - startTime;
    const ranCount = results.filter((r) => r?.ran).length;

    return NextResponse.json({
      ok: true,
      requested: n,
      ran: ranCount,
      elapsed_ms: elapsedMs,
      stopped_reason: stoppedReason,
      results,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: e?.status ?? 500 }
    );
  }
}

