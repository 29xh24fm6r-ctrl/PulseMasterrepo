// API Route: /api/emotion
// Emotion OS main endpoints

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { EmotionOS } from "@/lib/emotion-os";

// GET /api/emotion - Get current emotional context
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const includeContext = searchParams.get("context") === "true";

    if (includeContext) {
      const context = await EmotionOS.getEmotionContext(userId);
      return NextResponse.json(context);
    }

    const currentState = await EmotionOS.getCurrentEmotionState(userId);
    const trend = await EmotionOS.getEmotionTrend(userId, "day");

    return NextResponse.json({
      current: currentState,
      today_trend: trend,
    });
  } catch (error: any) {
    console.error("[Emotion GET] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/emotion - Detect emotion from text or record check-in
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // Detect emotion from text
    if (action === "detect" || body.text) {
      const { text, source, source_id, additional_context } = body;
      
      if (!text) {
        return NextResponse.json({ error: "text required" }, { status: 400 });
      }

      const state = await EmotionOS.detectAndStoreEmotion(userId, {
        text,
        source: source || "chat",
        source_id,
        additional_context,
      });

      return NextResponse.json({
        success: true,
        state: {
          emotion: state.detected_emotion,
          intensity: state.intensity,
          confidence: state.confidence,
          valence: state.valence,
          context: state.context_summary,
        },
      });
    }

    // Record check-in
    if (action === "checkin") {
      const { emotion, intensity, energy_level, notes, context_tags } = body;

      if (!emotion || intensity === undefined) {
        return NextResponse.json(
          { error: "emotion and intensity required" },
          { status: 400 }
        );
      }

      const checkin = await EmotionOS.recordCheckin(userId, {
        emotion,
        intensity,
        energy_level,
        notes,
        context_tags,
        checkin_type: "manual",
      });

      return NextResponse.json({
        success: true,
        checkin,
      });
    }

    // Log intervention
    if (action === "intervention") {
      const {
        intervention_type,
        intervention_name,
        was_effective,
        emotion_before,
        emotion_after,
        intensity_before,
        intensity_after,
        notes,
      } = body;

      if (!intervention_type || !intervention_name || was_effective === undefined) {
        return NextResponse.json(
          { error: "intervention_type, intervention_name, and was_effective required" },
          { status: 400 }
        );
      }

      const intervention = await EmotionOS.logIntervention(userId, {
        intervention_type,
        intervention_name,
        was_effective,
        emotion_before,
        emotion_after,
        intensity_before,
        intensity_after,
        notes,
      });

      return NextResponse.json({
        success: true,
        intervention,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[Emotion POST] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}