// Identity Engine v2 - Daily momentum scoring
import { createClient } from "@supabase/supabase-js";
import { llmJson } from "../llm/client";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface DailyMomentum {
  alignment_score: number; // 0-1: how aligned actions were with values
  reinforcement_events: string[];
  erosion_events: string[];
  net_momentum: number; // -1 to 1
  active_values: string[];
  active_roles: string[];
  insight: string;
}

export async function calculateDailyMomentum(userId: string, date?: Date): Promise<DailyMomentum | null> {
  const supabase = getSupabase();
  const targetDate = date || new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Get user's identity data
  const { data: values } = await supabase
    .from("id_values")
    .select("value_name, importance_rank")
    .eq("user_id", userId)
    .order("importance_rank", { ascending: true })
    .limit(5);

  const { data: roles } = await supabase
    .from("id_roles")
    .select("role_name, is_active")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(5);

  // Get day's activities
  const { data: tasks } = await supabase
    .from("tasks")
    .select("title, status, completed_at")
    .eq("user_id", userId)
    .gte("created_at", startOfDay.toISOString())
    .lte("created_at", endOfDay.toISOString());

  const { data: emotions } = await supabase
    .from("emo_states")
    .select("detected_emotion, valence, triggers")
    .eq("user_id", userId)
    .gte("occurred_at", startOfDay.toISOString())
    .lte("occurred_at", endOfDay.toISOString());

  const { data: fragments } = await supabase
    .from("tb_memory_fragments")
    .select("content, fragment_type")
    .eq("user_id", userId)
    .gte("created_at", startOfDay.toISOString())
    .lte("created_at", endOfDay.toISOString())
    .limit(20);

  if (!values?.length && !tasks?.length && !fragments?.length) {
    return null; // Not enough data
  }

  const valueNames = values?.map(v => v.value_name) || [];
  const roleNames = roles?.map(r => r.role_name) || [];
  const completedTasks = tasks?.filter(t => t.status === "completed") || [];
  const taskTitles = completedTasks.map(t => t.title).join(", ");
  const fragmentSummary = fragments?.map(f => f.content).join(" ").substring(0, 1000) || "";

  const prompt = `Analyze this person's day for identity alignment.

Core Values: ${valueNames.join(", ") || "Not defined"}
Active Roles: ${roleNames.join(", ") || "Not defined"}

Today's Completed Tasks: ${taskTitles || "None"}
Today's Activities/Thoughts: ${fragmentSummary || "None recorded"}
Emotional States: ${emotions?.map(e => e.detected_emotion).join(", ") || "None"}

Return JSON:
{
  "alignment_score": 0-1 (how aligned were today's actions with stated values),
  "reinforcement_events": ["specific actions that reinforced identity"],
  "erosion_events": ["actions that contradicted stated values/roles"],
  "net_momentum": -1 to 1 (overall identity momentum for the day),
  "active_values": ["values that were demonstrated today"],
  "active_roles": ["roles that were embodied today"],
  "insight": "One sentence insight about identity alignment today"
}`;

  try {
    const momentum = await llmJson({ prompt });

    // Store in id_momentum_daily
    const { error } = await supabase.from("id_momentum_daily").insert({
      user_id: userId,
      date: startOfDay.toISOString().split("T")[0],
      alignment_score: momentum.alignment_score,
      reinforcement_events: momentum.reinforcement_events,
      erosion_events: momentum.erosion_events,
      net_momentum: momentum.net_momentum,
      active_values: momentum.active_values,
      active_roles: momentum.active_roles,
      insight: momentum.insight,
      tasks_completed: completedTasks.length,
      emotions_logged: emotions?.length || 0,
    });

    if (error && !error.message.includes("duplicate")) {
      console.error("Failed to store momentum:", error);
    }

    return momentum;
  } catch (error) {
    console.error("Momentum calculation failed:", error);
    return null;
  }
}

export async function runNightlyIdentityScoring(): Promise<{ usersScored: number }> {
  const supabase = getSupabase();
  
  // Get users with activity today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { data: activeUsers } = await supabase
    .from("tasks")
    .select("user_id")
    .gte("created_at", today.toISOString());

  const uniqueUsers = [...new Set(activeUsers?.map(u => u.user_id) || [])];
  
  let scored = 0;
  for (const userId of uniqueUsers) {
    const momentum = await calculateDailyMomentum(userId);
    if (momentum) scored++;
  }

  return { usersScored: scored };
}

export default { calculateDailyMomentum, runNightlyIdentityScoring };