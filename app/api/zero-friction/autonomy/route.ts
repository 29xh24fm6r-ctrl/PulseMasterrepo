// Autonomy API - GET /api/zero-friction/autonomy
// app/api/zero-friction/autonomy/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAutonomyLevel, evaluateAutonomyLevel } from "@/lib/zero-friction/progressive-autonomy";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const evaluate = searchParams.get("evaluate") === "true";

    const state = evaluate ? await evaluateAutonomyLevel(userId) : await getAutonomyLevel(userId);

    return NextResponse.json({ state });
  } catch (error: any) {
    console.error("Failed to get autonomy level:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}



