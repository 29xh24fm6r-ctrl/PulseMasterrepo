// AGI Monitoring Tick API - Dev/Testing Endpoint
// POST /api/agi/monitoring/tick - Run scheduled checks for current user

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { runScheduledAGIChecksForUser } from "@/lib/agi/monitoring/daemon";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    await runScheduledAGIChecksForUser(userId, now);

    return NextResponse.json({
      ok: true,
      timestamp: now.toISOString(),
      message: "Scheduled AGI checks completed",
    });
  } catch (err: any) {
    console.error("[AGI Monitoring Tick] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to run scheduled checks" }, { status: 500 });
  }
}



