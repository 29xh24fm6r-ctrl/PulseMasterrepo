// Voice Autonomy Poll API (for live mode)
// app/api/voice/autonomy/poll/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { buildPulseCortexContext } from "@/lib/cortex/context";
import { evaluateTriggers } from "@/lib/voice/autonomy/voice-triggers";
import { generateVoiceIntervention } from "@/lib/voice/autonomy/voice-autonomy-engine";
import { VoiceAutonomyTrigger } from "@/lib/voice/autonomy/types";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const lastPollTime = searchParams.get("lastPollTime");
    const personaPreference = searchParams.get("personaPreference") as any;

    // Build context
    const ctx = await buildPulseCortexContext(userId);

    // Evaluate triggers
    const activeTriggers = evaluateTriggers(ctx);

    if (activeTriggers.length === 0) {
      return NextResponse.json({ intervention: null, activeTriggers: [] });
    }

    // Check for urgent triggers first
    const urgentTriggers: VoiceAutonomyTrigger[] = [
      "burnout_detected",
      "financial_risk_window",
      "emotion_spike",
      "autonomy_action_urgent",
    ];

    const urgentActive = activeTriggers.filter((t) => urgentTriggers.includes(t));

    // Generate intervention for highest priority trigger
    const priorityTrigger = urgentActive.length > 0 ? urgentActive[0] : activeTriggers[0];

    const intervention = await generateVoiceIntervention(
      userId,
      priorityTrigger,
      ctx,
      personaPreference
    );

    return NextResponse.json({
      intervention,
      activeTriggers,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error("[Voice Autonomy Poll] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to poll";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}



