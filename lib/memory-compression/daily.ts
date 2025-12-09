// Memory Compression - Daily summaries
import { createClient } from "@supabase/supabase-js";
import { llmJson } from "../llm/client";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface DailySummary {
  summary: string;
  key_events: string[];
  emotional_theme: string;
  identity_signal: string;
  productivity_score: number;
  notable_insights: string[];
  tomorrow_focus: string;
}

export async function generateDailySummary(userId: string, date?: Date): Promise<DailySummary | null> {
  const supabase = getSupabase();
  const targetDate = date || new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday by default
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Gather all data for the day
  const [fragmentsRes, tasksRes, emotionsRes, momentumRes] = await Promise.all([
    supabase.from("tb_memory_fragments").select("content, fragment_type").eq("user_id", userId)
      .gte("created_at", startOfDay.toISOString()).lte("created_at", endOfDay.toISOString()).limit(50),
    supabase.from("tasks").select("title, status, priority").eq("user_id", userId)
      .gte("created_at", startOfDay.toISOString()).lte("created_at", endOfDay.toISOString()),
    supabase.from("emo_states").select("detected_emotion, intensity, valence").eq("user_id", userId)
      .gte("occurred_at", startOfDay.toISOString()).lte("occurred_at", endOfDay.toISOString()),
    supabase.from("id_momentum_daily").select("*").eq("user_id", userId)
      .eq("date", startOfDay.toISOString().split("T")[0]).single(),
  ]);

  const fragments = fragmentsRes.data || [];
  const tasks = tasksRes.data || [];
  const emotions = emotionsRes.data || [];
  const momentum = momentumRes.data;

  if (fragments.length === 0 && tasks.length === 0 && emotions.length === 0) {
    return null;
  }

  const completedTasks = tasks.filter(t => t.status === "completed");
  const avgValence = emotions.length > 0 
    ? emotions.reduce((sum, e) => sum + (e.valence || 0), 0) / emotions.length 
    : 0;

  const prompt = `Create a daily summary for this person.

Memory Fragments (thoughts/activities):
${fragments.map(f => `- ${f.content}`).join("\n").substring(0, 2000)}

Tasks: ${completedTasks.length} completed out of ${tasks.length} total
High priority completed: ${completedTasks.filter(t => t.priority === "high").length}

Emotions throughout day: ${emotions.map(e => `${e.detected_emotion} (${e.intensity})`).join(", ")}
Average emotional valence: ${avgValence.toFixed(2)}

Identity momentum: ${momentum?.insight || "Not calculated"}

Return JSON:
{
  "summary": "2-3 sentence overview of the day",
  "key_events": ["up to 3 most significant events/activities"],
  "emotional_theme": "overall emotional character of the day",
  "identity_signal": "one way identity was reinforced or challenged",
  "productivity_score": 0-10,
  "notable_insights": ["any patterns or realizations"],
  "tomorrow_focus": "suggested focus for tomorrow"
}`;

  try {
    const summary = await llmJson({ prompt });

    // Store in tb_daily_summaries
    const { error } = await supabase.from("tb_daily_summaries").upsert({
      user_id: userId,
      date: startOfDay.toISOString().split("T")[0],
      summary: summary.summary,
      key_events: summary.key_events,
      emotional_theme: summary.emotional_theme,
      identity_signal: summary.identity_signal,
      productivity_score: summary.productivity_score,
      notable_insights: summary.notable_insights,
      tomorrow_focus: summary.tomorrow_focus,
      fragments_count: fragments.length,
      tasks_completed: completedTasks.length,
      avg_emotional_valence: avgValence,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,date" });

    if (error) console.error("Failed to store daily summary:", error);

    return summary;
  } catch (error) {
    console.error("Daily summary generation failed:", error);
    return null;
  }
}

export async function runNightlyDailySummaries(): Promise<{ summariesGenerated: number }> {
  const supabase = getSupabase();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  yesterday.setHours(0, 0, 0, 0);

  // Get users with activity yesterday
  const { data: activeUsers } = await supabase
    .from("tb_memory_fragments")
    .select("user_id")
    .gte("created_at", yesterday.toISOString())
    .lte("created_at", new Date(yesterday.getTime() + 24 * 60 * 60 * 1000).toISOString());

  const uniqueUsers = [...new Set(activeUsers?.map(u => u.user_id) || [])];
  
  let generated = 0;
  for (const userId of uniqueUsers) {
    const summary = await generateDailySummary(userId, yesterday);
    if (summary) generated++;
  }

  return { summariesGenerated: generated };
}

export default { generateDailySummary, runNightlyDailySummaries };