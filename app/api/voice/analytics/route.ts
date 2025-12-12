// Voice Analytics API
// app/api/voice/analytics/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export interface VoiceAnalyticsResponse {
  totalEvents: number;
  byEmotion: { emotion: string; count: number }[];
  byCoach: { coach_id: string; count: number }[];
  overridesUsage: { base_voice: string; final_voice: string; count: number }[];
  recentEvents: {
    id: string;
    coach_id: string;
    base_voice: string;
    final_voice: string;
    primary_emotion: string | null;
    temporary: boolean;
    created_at: string;
  }[];
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Get all events for user
    const { data: allEvents, error: eventsError } = await supabaseAdmin
      .from("voice_switch_events")
      .select("*")
      .eq("user_id", dbUserId)
      .order("created_at", { ascending: false });

    if (eventsError) {
      console.error("[VoiceAnalytics] Error fetching events:", eventsError);
      return NextResponse.json(
        { error: "Failed to fetch analytics" },
        { status: 500 }
      );
    }

    const events = allEvents || [];
    const totalEvents = events.length;

    // Group by emotion
    const emotionMap = new Map<string, number>();
    events.forEach((e) => {
      const emotion = e.primary_emotion || "none";
      emotionMap.set(emotion, (emotionMap.get(emotion) || 0) + 1);
    });
    const byEmotion = Array.from(emotionMap.entries()).map(([emotion, count]) => ({
      emotion,
      count,
    }));

    // Group by coach
    const coachMap = new Map<string, number>();
    events.forEach((e) => {
      coachMap.set(e.coach_id, (coachMap.get(e.coach_id) || 0) + 1);
    });
    const byCoach = Array.from(coachMap.entries()).map(([coach_id, count]) => ({
      coach_id: coach_id,
      count,
    }));

    // Group by override usage (where base != final)
    const overrideMap = new Map<string, number>();
    events
      .filter((e) => e.base_voice !== e.final_voice)
      .forEach((e) => {
        const key = `${e.base_voice}→${e.final_voice}`;
        overrideMap.set(key, (overrideMap.get(key) || 0) + 1);
      });
    const overridesUsage = Array.from(overrideMap.entries()).map(([key, count]) => {
      const [base_voice, final_voice] = key.split("→");
      return { base_voice, final_voice, count };
    });

    // Recent events (last 20)
    const recentEvents = events.slice(0, 20).map((e) => ({
      id: e.id,
      coach_id: e.coach_id,
      base_voice: e.base_voice,
      final_voice: e.final_voice,
      primary_emotion: e.primary_emotion,
      temporary: e.temporary,
      created_at: e.created_at,
    }));

    return NextResponse.json({
      totalEvents,
      byEmotion,
      byCoach,
      overridesUsage,
      recentEvents,
    });
  } catch (err: any) {
    console.error("[VoiceAnalytics] Exception:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

