// Voice Selection API
// app/api/voice/select/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDynamicVoiceProfile } from "@/lib/voice/emotion-switcher";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { coachId, userInput } = body;

    if (!coachId) {
      return NextResponse.json(
        { error: "coachId is required" },
        { status: 400 }
      );
    }

    const profile = await getDynamicVoiceProfile(userId, coachId, userInput);

    return NextResponse.json(profile);
  } catch (err: any) {
    console.error("[VoiceSelect] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to select voice profile" },
      { status: 500 }
    );
  }
}

