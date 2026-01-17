import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdminRuntimeClient, getSupabaseRuntimeClient } from "@/lib/runtime/supabase.runtime";

function getSupabase() {
  return getSupabaseAdminRuntimeClient();
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  try {
    const [nextActionRes, momentumRes, statesRes, profileRes, summaryRes] = await Promise.all([
      supabase.from("tasks").select("id, title, priority, due_date, status")
        .eq("user_id", userId).eq("status", "pending")
        .order("priority", { ascending: false }).order("due_date", { ascending: true })
        .limit(1).single(),
      supabase.from("id_momentum_daily").select("*")
        .eq("user_id", userId).order("date", { ascending: false }).limit(7),
      supabase.from("emo_states").select("detected_emotion, intensity, valence, occurred_at")
        .eq("user_id", userId).gte("occurred_at", weekAgo).order("occurred_at", { ascending: false }).limit(20),
      supabase.from("emo_profiles").select("*").eq("user_id", userId).single(),
      supabase.from("tb_daily_summaries").select("*").eq("user_id", userId).eq("date", yesterday).single(),
    ]);

    return NextResponse.json({
      nextAction: nextActionRes.data,
      momentum: momentumRes.data || [],
      emotionData: {
        recentStates: statesRes.data || [],
        profile: profileRes.data,
      },
      summary: summaryRes.data,
    });
  } catch (error) {
    console.error("Frontier dashboard error:", error);
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}