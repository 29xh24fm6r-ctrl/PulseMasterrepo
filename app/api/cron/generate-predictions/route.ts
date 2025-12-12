// Cron: Generate Behavior Predictions
// app/api/cron/generate-predictions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { runMorningPredictionGeneration } from "@/lib/patterns/cron";

// This endpoint should be protected with a secret token
const CRON_SECRET = process.env.CRON_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    // Verify secret token
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}` && CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await runMorningPredictionGeneration();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[CronPredictions] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate predictions" },
      { status: 500 }
    );
  }
}

