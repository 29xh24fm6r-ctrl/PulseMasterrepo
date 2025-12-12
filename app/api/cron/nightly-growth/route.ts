// Cron: Nightly Growth Job
// app/api/cron/nightly-growth/route.ts

import { NextRequest, NextResponse } from "next/server";
import { runNightlyGrowthJob } from "@/lib/jobs/nightly-growth-job";

const CRON_SECRET = process.env.CRON_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    // Verify secret token
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}` && CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await runNightlyGrowthJob();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[CronNightlyGrowth] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to run nightly growth job" },
      { status: 500 }
    );
  }
}

