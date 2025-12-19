// Voice Autonomy Fire API
// app/api/voice/autonomy/fire/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getWorkCortexContextForUser } from "@/lib/cortex/context";
import { generateVoiceIntervention } from "@/lib/voice/autonomy/voice-autonomy-engine";
import { evaluateTriggers } from "@/lib/voice/autonomy/voice-triggers";
import { shouldFireIntervention } from "@/lib/voice/autonomy/voice-autonomy-engine";
import { VoiceAutonomyTrigger } from "@/lib/voice/autonomy/types";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { trigger, personaOverride } = body;

    // Build context
    const ctx = await getWorkCortexContextForUser(userId);

    // If no trigger specified, evaluate all triggers
    if (!trigger) {
      const activeTriggers = evaluateTriggers(ctx);
      if (activeTriggers.length === 0) {
        return NextResponse.json({ intervention: null, message: "No active triggers" });
      }

      // Use first active trigger
      const firstTrigger = activeTriggers[0];
      const intervention = await generateVoiceIntervention(
        userId,
        firstTrigger,
        ctx,
        personaOverride
      );

      return NextResponse.json({ intervention });
    }

    // Check cooldown (would need to fetch from store/db)
    // For now, generate intervention
    const intervention = await generateVoiceIntervention(
      userId,
      trigger as VoiceAutonomyTrigger,
      ctx,
      personaOverride
    );

    if (!intervention) {
      return NextResponse.json(
        { error: "Trigger not active or on cooldown" },
        { status: 400 }
      );
    }

    return NextResponse.json({ intervention });
  } catch (err: unknown) {
    console.error("[Voice Autonomy] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to fire intervention";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}



