// Memory Compression - Weekly/Monthly rollups
import { getSupabaseAdminRuntimeClient, getSupabaseRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { llmJson } from "../llm/client";

function getSupabase() {
  return getSupabaseAdminRuntimeClient();
}

interface PeriodSummary {
  summary: string;
  highlights: string[];
  challenges: string[];
  emotional_journey: string;
  identity_growth: string;
  productivity_avg: number;
  key_accomplishments: string[];
  patterns_noticed: string[];
  next_period_focus: string;
}

export async function generateWeeklySummary(userId: string, weekStart?: Date): Promise<PeriodSummary | null> {
  const supabase = getSupabase();
  const start = weekStart || getLastWeekStart();
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Get daily summaries for the week
  const { data: dailies } = await supabase
    .from("tb_daily_summaries")
    .select("*")
    .eq("user_id", userId)
    .gte("date", start.toISOString().split("T")[0])
    .lt("date", end.toISOString().split("T")[0])
    .order("date", { ascending: true });

  if (!dailies || dailies.length < 2) return null;

  const avgProductivity = dailies.reduce((sum, d) => sum + (d.productivity_score || 0), 0) / dailies.length;
  const allEvents = dailies.flatMap(d => d.key_events || []);
  const allInsights = dailies.flatMap(d => d.notable_insights || []);

  const prompt = `Create a weekly summary from these daily summaries.

Daily Summaries:
${dailies.map(d => `${d.date}: ${d.summary}\nEmotional: ${d.emotional_theme}\nIdentity: ${d.identity_signal}`).join("\n\n")}

Key events across the week: ${allEvents.join(", ")}
Insights collected: ${allInsights.join(", ")}
Average productivity: ${avgProductivity.toFixed(1)}/10

Return JSON:
{
  "summary": "3-4 sentence overview of the week",
  "highlights": ["top 3-5 positive moments"],
  "challenges": ["difficulties faced"],
  "emotional_journey": "how emotions evolved through the week",
  "identity_growth": "identity development this week",
  "productivity_avg": ${avgProductivity.toFixed(1)},
  "key_accomplishments": ["what was achieved"],
  "patterns_noticed": ["recurring themes or behaviors"],
  "next_period_focus": "recommended focus for next week"
}`;

  try {
    const summary = await llmJson({ prompt });

    // Store in tb_period_summaries
    const { error } = await supabase.from("tb_period_summaries").upsert({
      user_id: userId,
      period_type: "weekly",
      period_start: start.toISOString().split("T")[0],
      period_end: new Date(end.getTime() - 1).toISOString().split("T")[0],
      summary: summary.summary,
      highlights: summary.highlights,
      challenges: summary.challenges,
      emotional_journey: summary.emotional_journey,
      identity_growth: summary.identity_growth,
      productivity_avg: summary.productivity_avg,
      key_accomplishments: summary.key_accomplishments,
      patterns_noticed: summary.patterns_noticed,
      next_period_focus: summary.next_period_focus,
      days_summarized: dailies.length,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,period_type,period_start" });

    if (error) console.error("Failed to store weekly summary:", error);

    return summary;
  } catch (error) {
    console.error("Weekly summary generation failed:", error);
    return null;
  }
}

export async function generateMonthlySummary(userId: string, monthStart?: Date): Promise<PeriodSummary | null> {
  const supabase = getSupabase();
  const start = monthStart || getLastMonthStart();
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);

  // Get weekly summaries for the month
  const { data: weeklies } = await supabase
    .from("tb_period_summaries")
    .select("*")
    .eq("user_id", userId)
    .eq("period_type", "weekly")
    .gte("period_start", start.toISOString().split("T")[0])
    .lt("period_start", end.toISOString().split("T")[0]);

  // Also get daily summaries if not enough weeklies
  const { data: dailies } = await supabase
    .from("tb_daily_summaries")
    .select("*")
    .eq("user_id", userId)
    .gte("date", start.toISOString().split("T")[0])
    .lt("date", end.toISOString().split("T")[0]);

  if ((!weeklies || weeklies.length === 0) && (!dailies || dailies.length < 5)) {
    return null;
  }

  const avgProductivity = dailies 
    ? dailies.reduce((sum, d) => sum + (d.productivity_score || 0), 0) / dailies.length
    : weeklies!.reduce((sum, w) => sum + (w.productivity_avg || 0), 0) / weeklies!.length;

  const prompt = `Create a monthly summary.

Weekly summaries:
${weeklies?.map(w => `Week of ${w.period_start}: ${w.summary}`).join("\n") || "None available"}

Key accomplishments: ${weeklies?.flatMap(w => w.key_accomplishments || []).join(", ") || dailies?.flatMap(d => d.key_events || []).join(", ")}
Patterns: ${weeklies?.flatMap(w => w.patterns_noticed || []).join(", ")}
Average productivity: ${avgProductivity.toFixed(1)}/10

Return JSON:
{
  "summary": "4-5 sentence overview of the month",
  "highlights": ["top accomplishments"],
  "challenges": ["major challenges"],
  "emotional_journey": "emotional arc of the month",
  "identity_growth": "how identity evolved",
  "productivity_avg": ${avgProductivity.toFixed(1)},
  "key_accomplishments": ["significant achievements"],
  "patterns_noticed": ["monthly patterns"],
  "next_period_focus": "focus for next month"
}`;

  try {
    const summary = await llmJson({ prompt });

    const { error } = await supabase.from("tb_period_summaries").upsert({
      user_id: userId,
      period_type: "monthly",
      period_start: start.toISOString().split("T")[0],
      period_end: new Date(end.getTime() - 1).toISOString().split("T")[0],
      ...summary,
      days_summarized: dailies?.length || 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,period_type,period_start" });

    if (error) console.error("Failed to store monthly summary:", error);

    return summary;
  } catch (error) {
    console.error("Monthly summary generation failed:", error);
    return null;
  }
}

function getLastWeekStart(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? 7 : dayOfWeek;
  const lastSunday = new Date(now);
  lastSunday.setDate(now.getDate() - diff - 7);
  lastSunday.setHours(0, 0, 0, 0);
  return lastSunday;
}

function getLastMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 1, 1);
}

export async function runWeeklySummaries(): Promise<{ generated: number }> {
  const supabase = getSupabase();
  const weekStart = getLastWeekStart();
  
  const { data: users } = await supabase
    .from("tb_daily_summaries")
    .select("user_id")
    .gte("date", weekStart.toISOString().split("T")[0]);

  const uniqueUsers = [...new Set(users?.map(u => u.user_id) || [])];
  
  let generated = 0;
  for (const userId of uniqueUsers) {
    const summary = await generateWeeklySummary(userId, weekStart);
    if (summary) generated++;
  }

  return { generated };
}

export async function runMonthlySummaries(): Promise<{ generated: number }> {
  const supabase = getSupabase();
  const monthStart = getLastMonthStart();
  
  const { data: users } = await supabase
    .from("tb_daily_summaries")
    .select("user_id")
    .gte("date", monthStart.toISOString().split("T")[0]);

  const uniqueUsers = [...new Set(users?.map(u => u.user_id) || [])];
  
  let generated = 0;
  for (const userId of uniqueUsers) {
    const summary = await generateMonthlySummary(userId, monthStart);
    if (summary) generated++;
  }

  return { generated };
}

export default { generateWeeklySummary, generateMonthlySummary, runWeeklySummaries, runMonthlySummaries };