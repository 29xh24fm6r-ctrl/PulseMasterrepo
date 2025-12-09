import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { llmJson } from "@/lib/llm/client";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Try to get existing summary
  const { data: existingSummary } = await supabase
    .from("tb_daily_summaries")
    .select("*")
    .eq("user_id", userId)
    .eq("date", yesterday)
    .single();

  if (existingSummary) {
    return NextResponse.json({
      summary: existingSummary.summary,
      key_events: existingSummary.key_events?.slice(0, 2) || [],
      identity_signal: existingSummary.identity_signal,
      emotional_theme: existingSummary.emotional_theme,
      spoken: `Yesterday: ${existingSummary.summary} Your emotional theme was ${existingSummary.emotional_theme}. ${existingSummary.identity_signal ? `Identity-wise, ${existingSummary.identity_signal}.` : ""}`
    });
  }

  // Generate live summary from fragments
  const startOfYesterday = new Date(yesterday);
  startOfYesterday.setHours(0, 0, 0, 0);
  const endOfYesterday = new Date(yesterday);
  endOfYesterday.setHours(23, 59, 59, 999);

  const [fragmentsRes, tasksRes, emotionsRes] = await Promise.all([
    supabase.from("tb_memory_fragments").select("content").eq("user_id", userId)
      .gte("created_at", startOfYesterday.toISOString())
      .lte("created_at", endOfYesterday.toISOString()).limit(20),
    supabase.from("tasks").select("title, status").eq("user_id", userId)
      .gte("created_at", startOfYesterday.toISOString())
      .lte("created_at", endOfYesterday.toISOString()),
    supabase.from("emo_states").select("detected_emotion").eq("user_id", userId)
      .gte("occurred_at", startOfYesterday.toISOString())
      .lte("occurred_at", endOfYesterday.toISOString()),
  ]);

  const fragments = fragmentsRes.data || [];
  const tasks = tasksRes.data || [];
  const emotions = emotionsRes.data || [];

  if (fragments.length === 0 && tasks.length === 0) {
    return NextResponse.json({
      summary: "No activity recorded yesterday.",
      key_events: [],
      identity_signal: null,
      emotional_theme: null,
      spoken: "I don't have any data from yesterday to summarize."
    });
  }

  const prompt = `Summarize this person's yesterday for a voice assistant response.

Activities: ${fragments.map(f => f.content).join("; ").substring(0, 1000)}
Tasks: ${tasks.filter(t => t.status === "completed").map(t => t.title).join(", ") || "None completed"}
Emotions: ${emotions.map(e => e.detected_emotion).join(", ") || "Not tracked"}

Return JSON:
{
  "summary": "2 sentence summary",
  "key_events": ["event 1", "event 2"],
  "identity_signal": "one identity observation or null",
  "emotional_theme": "overall emotional theme"
}`;

  try {
    const result = await llmJson({ prompt });
    
    return NextResponse.json({
      ...result,
      spoken: `Yesterday: ${result.summary} Your emotional theme was ${result.emotional_theme || "mixed"}. ${result.identity_signal ? `Identity-wise, ${result.identity_signal}.` : ""}`
    });
  } catch (error) {
    console.error("Voice summarize-day failed:", error);
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}