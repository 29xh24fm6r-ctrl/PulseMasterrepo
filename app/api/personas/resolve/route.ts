// Persona Resolution API
// app/api/personas/resolve/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolvePersona, calculateDrift, RouterContext } from "@/lib/personas/context-router";
import { getCurrentEmotionState } from "@/lib/emotion-os";
import { getCareerContextForMemory } from "@/lib/career/integrations";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { coachId } = body;

    if (!coachId) {
      return NextResponse.json({ error: "coachId required" }, { status: 400 });
    }

    // Get user voice settings
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    const { data: voiceSettings } = await supabaseAdmin
      .from("user_voice_settings")
      .select("preferred_coach_voice")
      .eq("user_id", dbUserId)
      .maybeSingle();

    // Get emotion state
    let emotionState = null;
    try {
      const emotion = await getCurrentEmotionState(userId);
      if (emotion) {
        emotionState = {
          primary: emotion.detected_emotion?.toLowerCase() || null,
          intensity: emotion.intensity || 0.5,
        };
      }
    } catch (err) {
      console.warn("[PersonaResolve] Failed to get emotion:", err);
    }

    // Get career context
    let careerContext = null;
    try {
      const career = await getCareerContextForMemory(userId);
      if (career) {
        careerContext = {
          level: career.level,
          progressToNext: career.progressToNext,
        };
      }
    } catch (err) {
      console.warn("[PersonaResolve] Failed to get career context:", err);
    }

    // Build router context
    const routerContext: RouterContext = {
      coachId,
      userEmotion: emotionState,
      currentTime: new Date(),
      userPreferences: voiceSettings || null,
      jobContext: careerContext,
    };

    // Calculate drift
    const drift = calculateDrift(routerContext);
    routerContext.activeDrift = drift;

    // Resolve persona
    const resolved = await resolvePersona(userId, routerContext);

    return NextResponse.json(resolved);
  } catch (err: any) {
    console.error("[PersonaResolve] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to resolve persona" },
      { status: 500 }
    );
  }
}




