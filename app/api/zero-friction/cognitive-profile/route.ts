// Cognitive Profile API - GET /api/zero-friction/cognitive-profile
// app/api/zero-friction/cognitive-profile/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCognitiveProfile, inferCognitiveProfile } from "@/lib/zero-friction/cognitive-profile";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getCognitiveProfile(userId);

    if (!profile) {
      // Infer if doesn't exist
      const inferred = await inferCognitiveProfile(userId);
      return NextResponse.json({ profile: inferred });
    }

    return NextResponse.json({ profile });
  } catch (error: any) {
    console.error("Failed to get cognitive profile:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await inferCognitiveProfile(userId);

    return NextResponse.json({ profile });
  } catch (error: any) {
    console.error("Failed to infer cognitive profile:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}



