// Life Mission & Purpose API
// app/api/purpose/mission/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { buildPulseCortexContext } from "@/lib/cortex/context";
import { scanMission, generateMissionInsights } from "@/lib/purpose/v1/scanner";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await buildPulseCortexContext(userId);
    const missionProfile = await scanMission(userId, ctx);
    const insights = await generateMissionInsights(missionProfile, ctx);

    return NextResponse.json({
      profile: missionProfile,
      insights,
    });
  } catch (err: unknown) {
    console.error("[Mission] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to scan mission";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}



