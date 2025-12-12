// Rebuild Strategy API
// app/api/strategy/rebuild/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { buildStrategySnapshot } from "@/lib/strategy/planner";
import { getCurrentStrategy } from "@/lib/strategy/api";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const horizonDays = body.horizonDays || 90;

    // Build new snapshot
    await buildStrategySnapshot(userId, horizonDays);

    // Return the new strategy
    const strategy = await getCurrentStrategy(userId, horizonDays);

    return NextResponse.json({ strategy });
  } catch (err: any) {
    console.error("[StrategyRebuild] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to rebuild strategy" },
      { status: 500 }
    );
  }
}




