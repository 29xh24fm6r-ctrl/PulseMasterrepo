// Guardian Mode API - GET /api/zero-friction/guardian
// app/api/zero-friction/guardian/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getGuardianState, checkGuardianMode } from "@/lib/zero-friction/guardian-mode";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const check = searchParams.get("check") === "true";

    const state = check ? await checkGuardianMode(userId) : await getGuardianState(userId);

    return NextResponse.json({ state });
  } catch (error: any) {
    console.error("Failed to get guardian state:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}



