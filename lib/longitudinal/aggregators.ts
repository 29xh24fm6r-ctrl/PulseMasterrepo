// Longitudinal - Daily metrics aggregation
import { getSupabaseAdminRuntimeClient, getSupabaseRuntimeClient } from "@/lib/runtime/supabase.runtime";

function getSupabase() {
  return getSupabaseAdminRuntimeClient();
}

interface DailyMetrics {
  tasks_completed: number;
  tasks_created: number;
  completion_rate: number;
  high_priority_completed: number;
  sessions_count: number;
  sessions_duration_minutes: number;
  identity_alignment: number;
  avg_emotion_intensity: number;
  avg_emotion_valence: number;
  deal_touches: number;
  fragments_created: number;
  productivity_score: number;
}

export async function aggregateDailyMetrics(userId: string, date?: Date): Promise<DailyMetrics | null> {
  const supabase = getSupabase();
  const targetDate = date || new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Aggregate tasks
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, status, priority")
    .eq("user_id", userId)
    .gte("created_at", startOfDay.toISOString())
    .lte("created_at", endOfDay.toISOString());

  const tasksCreated = tasks?.length || 0;
  const tasksCompleted = tasks?.filter(t => t.status === "completed").length || 0;
  const highPriorityCompleted = tasks?.filter(t => t.status === "completed" && t.priority === "high").length || 0;
  const completionRate = tasksCreated > 0 ? tasksCompleted / tasksCreated : 0;

  // Aggregate sessions (pomodoro/focus sessions)
  const { data: sessions } = await supabase
    .from("pomodoro_sessions")
    .select("id, duration_minutes")
    .eq("user_id", userId)
    .gte("started_at", startOfDay.toISOString())
    .lte("started_at", endOfDay.toISOString());

  const sessionsCount = sessions?.length || 0;
  const sessionsDuration = sessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0;

  // Get identity alignment from momentum
  const { data: momentum } = await supabase
    .from("id_momentum_daily")
    .select("alignment_score")
    .eq("user_id", userId)
    .eq("date", startOfDay.toISOString().split("T")[0])
    .single();

  // Aggregate emotions
  const { data: emotions } = await supabase
    .from("emo_states")
    .select("intensity, valence")
    .eq("user_id", userId)
    .gte("occurred_at", startOfDay.toISOString())
    .lte("occurred_at", endOfDay.toISOString());

  const avgIntensity = emotions?.length 
    ? emotions.reduce((sum, e) => sum + (e.intensity || 0), 0) / emotions.length 
    : 0;
  const avgValence = emotions?.length
    ? emotions.reduce((sum, e) => sum + (e.valence || 0), 0) / emotions.length
    : 0;

  // Count deal touches
  const { count: dealTouches } = await supabase
    .from("deal_activities")
    .select("id", { count: "exact" })
    .eq("user_id", userId)
    .gte("created_at", startOfDay.toISOString())
    .lte("created_at", endOfDay.toISOString());

  // Count fragments
  const { count: fragmentsCount } = await supabase
    .from("tb_memory_fragments")
    .select("id", { count: "exact" })
    .eq("user_id", userId)
    .gte("created_at", startOfDay.toISOString())
    .lte("created_at", endOfDay.toISOString());

  // Calculate productivity score (0-10)
  const productivityScore = Math.min(10, Math.round(
    (completionRate * 3) +
    (Math.min(tasksCompleted, 10) / 10 * 2) +
    (Math.min(sessionsCount, 8) / 8 * 2) +
    (Math.min(sessionsDuration, 240) / 240 * 2) +
    ((momentum?.alignment_score || 0.5) * 1)
  ));

  const metrics: DailyMetrics = {
    tasks_completed: tasksCompleted,
    tasks_created: tasksCreated,
    completion_rate: completionRate,
    high_priority_completed: highPriorityCompleted,
    sessions_count: sessionsCount,
    sessions_duration_minutes: sessionsDuration,
    identity_alignment: momentum?.alignment_score || 0,
    avg_emotion_intensity: avgIntensity,
    avg_emotion_valence: avgValence,
    deal_touches: dealTouches || 0,
    fragments_created: fragmentsCount || 0,
    productivity_score: productivityScore,
  };

  // Store in lb_daily_metrics
  const { error } = await supabase.from("lb_daily_metrics").upsert({
    user_id: userId,
    date: startOfDay.toISOString().split("T")[0],
    ...metrics,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,date" });

  if (error) console.error("Failed to store daily metrics:", error);

  return metrics;
}

export async function runNightlyMetricsAggregation(): Promise<{ usersProcessed: number }> {
  const supabase = getSupabase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get users with any activity today
  const { data: activeUsers } = await supabase
    .from("tasks")
    .select("user_id")
    .gte("created_at", today.toISOString());

  const uniqueUsers = [...new Set(activeUsers?.map(u => u.user_id) || [])];
  
  let processed = 0;
  for (const userId of uniqueUsers) {
    const metrics = await aggregateDailyMetrics(userId, today);
    if (metrics) processed++;
  }

  return { usersProcessed: processed };
}

export default { aggregateDailyMetrics, runNightlyMetricsAggregation };