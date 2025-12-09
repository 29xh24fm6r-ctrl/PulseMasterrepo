import { NextRequest, NextResponse } from "next/server";
import { runNightlyProfiler } from "@/lib/emotion-os/profiler";
import { runNightlyIdentityScoring } from "@/lib/identity/scoring";
import { runNightlyDailySummaries } from "@/lib/memory-compression/daily";
import { runNightlyMetricsAggregation } from "@/lib/longitudinal/aggregators";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, any> = {};

  try {
    // Run all nightly jobs
    results.emotionProfiles = await runNightlyProfiler();
    results.identityScoring = await runNightlyIdentityScoring();
    results.dailySummaries = await runNightlyDailySummaries();
    results.metricsAggregation = await runNightlyMetricsAggregation();

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Nightly cron failed:", error);
    return NextResponse.json({ error: "Cron failed", partial: results }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const maxDuration = 300;