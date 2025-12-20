// Coach Voice Resolution API
// app/api/voices/[coach]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveVoice, CoachId } from "@/lib/voices/router";
import { getCurrentEmotionState } from "@/lib/emotion-os/server";
import { getCareerContextForMemory } from "@/lib/career/integrations";

export async function GET(
  req: NextRequest,
  { params }: { params: { coach: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const coachId = params.coach as CoachId;

    // Get user voice settings
    const { data: userRow, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();

    if (userError && userError.code !== 'PGRST116') {
      console.warn("[VoiceRouter] Failed to get user:", userError);
    }

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
      console.warn("[VoiceRouter] Failed to get emotion:", err);
    }

    // Get career context
    let careerContext = null;
    try {
      careerContext = await getCareerContextForMemory(userId);
    } catch (err) {
      console.warn("[VoiceRouter] Failed to get career context:", err);
    }

    // Validate coachId
    const validCoachIds: CoachId[] = ["sales", "confidant", "career", "philosophy", "emotional", "autopilot", "roleplay", "general"];
    if (!validCoachIds.includes(coachId)) {
      return NextResponse.json(
        { error: `Invalid coach ID: ${coachId}` },
        { status: 400 }
      );
    }

    // Resolve voice
    const resolved = await resolveVoice({
      coachId,
      userEmotion: emotionState,
      userSettings: voiceSettings || null,
      careerContext: careerContext || null,
    });

    if (!resolved || !resolved.profile) {
      return NextResponse.json(
        { error: "Failed to resolve voice profile" },
        { status: 500 }
      );
    }

    return NextResponse.json(resolved);
  } catch (err: unknown) {
    console.error("[VoiceRouter] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to resolve voice";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}


