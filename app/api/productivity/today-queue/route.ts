// Today Command Queue API
// app/api/productivity/today-queue/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { buildTodayQueue } from "@/lib/productivity/queue";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const autonomousMode = searchParams.get("autonomous") === "true";
    const includeEF = searchParams.get("ef") !== "false"; // Default true
    const includeThirdBrain = searchParams.get("thirdBrain") !== "false"; // Default true

    const queue = await buildTodayQueue(userId, {
      includeThirdBrain,
      includeEFAnalysis: includeEF,
      autonomousMode,
    });

    // If queue is empty, suggest triggering Autopilot
    if (queue.length === 0) {
      return NextResponse.json({
        queue: [],
        suggestion: "autopilot_scan",
        message: "Queue is empty. Consider running Autopilot to generate suggestions.",
      });
    }

    return NextResponse.json({ queue });
  } catch (err: unknown) {
    console.error("[ProductivityQueue] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to load queue";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

