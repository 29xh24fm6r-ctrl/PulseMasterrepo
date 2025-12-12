// Cron: Recompute Power Patterns
// app/api/cron/recompute-patterns/route.ts

import { NextRequest, NextResponse } from "next/server";
import { runNightlyPatternRecomputation } from "@/lib/patterns/cron";

// This endpoint should be protected with a secret token
const CRON_SECRET = process.env.CRON_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    // Verify secret token
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}` && CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await runNightlyPatternRecomputation();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[CronPatterns] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to recompute patterns" },
      { status: 500 }
    );
  }
}

