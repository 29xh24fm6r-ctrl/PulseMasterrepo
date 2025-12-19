// Deep Narrative Engine API
// app/api/narrative/build/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getWorkCortexContextForUser } from "@/lib/cortex/context";
import { buildLifeNarrative } from "@/lib/cortex/sovereign/deep-narrative/builder";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getWorkCortexContextForUser(userId);
    const narrative = await buildLifeNarrative(userId, ctx);

    return NextResponse.json(narrative);
  } catch (err: unknown) {
    console.error("[Narrative] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to build narrative";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}



