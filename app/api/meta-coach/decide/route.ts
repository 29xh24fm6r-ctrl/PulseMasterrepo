// Meta-Coach Decision API
// app/api/meta-coach/decide/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { decideMetaCoachAction } from "@/lib/meta-coach/engine";
import { getCurrentEmotionState } from "@/lib/emotion-os/server";
import { getTodayPredictions } from "@/lib/prediction/engine";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { currentCoachId, lastUserMessage } = body;

    if (!currentCoachId) {
      return NextResponse.json(
        { error: "currentCoachId is required" },
        { status: 400 }
      );
    }

    // Get current emotion
    let emotionPrimary: string | null = null;
    try {
      const emotionState = await getCurrentEmotionState(userId);
      emotionPrimary = emotionState?.detected_emotion?.toLowerCase() || null;
    } catch (err) {
      console.warn("[MetaCoach] Failed to get emotion state:", err);
    }

    // Get risk prediction for current hour
    let riskPrediction = null;
    try {
      const predictions = await getTodayPredictions(userId);
      const now = new Date();
      const currentHour = now.getHours();

      // Find prediction that overlaps with current time
      riskPrediction = predictions.find((p) => {
        const start = new Date(p.window_start);
        const end = new Date(p.window_end);
        return start.getTime() <= now.getTime() && end.getTime() >= now.getTime();
      });
    } catch (err) {
      console.warn("[MetaCoach] Failed to get predictions:", err);
    }

    // Get recent turns
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    const { data: sessions } = await supabaseAdmin
      .from("coaching_sessions")
      .select("id")
      .eq("user_id", dbUserId)
      .order("started_at", { ascending: false })
      .limit(1);

    let recentTurns: any[] = [];
    if (sessions && sessions.length > 0) {
      const { data: turns } = await supabaseAdmin
        .from("coaching_turns")
        .select("session_id, emotion, intent")
        .eq("session_id", sessions[0].id)
        .order("turn_index", { ascending: false })
        .limit(5);

      // Get coach_id from sessions
      const sessionCoachIds = await Promise.all(
        (turns || []).map(async (turn) => {
          const { data: session } = await supabaseAdmin
            .from("coaching_sessions")
            .select("coach_id")
            .eq("id", turn.session_id)
            .single();
          return {
            coachId: session?.coach_id || currentCoachId,
            emotion: turn.emotion,
            intent: turn.intent,
          };
        })
      );

      recentTurns = sessionCoachIds;
    }

    // Make decision
    const decision = await decideMetaCoachAction({
      userId,
      currentCoachId,
      emotionPrimary,
      riskPrediction: riskPrediction
        ? {
            risk_type: riskPrediction.risk_type,
            risk_score: riskPrediction.risk_score,
            window_start: riskPrediction.window_start,
          }
        : undefined,
      recentTurns,
    });

    return NextResponse.json({ decision });
  } catch (err: any) {
    console.error("[MetaCoach] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to make meta-coach decision" },
      { status: 500 }
    );
  }
}

