// Adaptive Interface API - GET /api/zero-friction/adaptive-interface
// app/api/zero-friction/adaptive-interface/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCognitiveProfile } from "@/lib/zero-friction/cognitive-profile";
import { composeAdaptiveInterface } from "@/lib/zero-friction/adaptive-interface";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getCognitiveProfile(userId);
    if (!profile) {
      return NextResponse.json({ error: "Cognitive profile not found" }, { status: 404 });
    }

    const config = await composeAdaptiveInterface(userId, profile);

    return NextResponse.json({ config });
  } catch (error: any) {
    console.error("Failed to compose adaptive interface:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}



