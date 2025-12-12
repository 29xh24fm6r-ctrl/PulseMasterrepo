// Nightly Job Aggregates Cron
// app/api/cron/nightly-job-aggregates/route.ts

import { NextRequest, NextResponse } from "next/server";
import { computeJobScoreAggregates } from "@/lib/scoreboard/global";

export async function POST(req: NextRequest) {
  try {
    // Verify cron secret if needed
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await computeJobScoreAggregates(yesterday);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[JobAggregates] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to compute aggregates" },
      { status: 500 }
    );
  }
}




