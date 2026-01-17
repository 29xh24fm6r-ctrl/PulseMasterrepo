// Proactive Intelligence Engine
// Generates interventions, nudges, and coaching based on user state
import { getSupabaseAdminRuntimeClient, getSupabaseRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { llmJson } from "@/lib/llm/client";

function getSupabase() {
  return getSupabaseAdminRuntimeClient();
}

export interface Intervention {
  id?: string;
  type: "nudge" | "coaching" | "alert" | "celebration" | "reflection";
  priority: "low" | "medium" | "high" | "urgent";
  title: string;
  message: string;
  action_type?: string;
  action_data?: Record<string, any>;
  trigger_reason: string;
  expires_at?: string;
}

export async function generateProactiveInterventions(userId: string): Promise<Intervention[]> {
  const supabase = getSupabase();
  const interventions: Intervention[] = [];

  // Gather current state
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const [emotionsRes, tasksRes, momentumRes, streaksRes] = await Promise.all([
    supabase.from("emo_states").select("detected_emotion, valence, intensity")
      .eq("user_id", userId).gte("occurred_at", todayStart.toISOString()).order("occurred_at", { ascending: false }).limit(5),
    supabase.from("tasks").select("id, title, status, priority, due_date")
      .eq("user_id", userId).eq("status", "pending").order("due_date", { ascending: true }).limit(10),
    supabase.from("id_momentum_daily").select("net_momentum, alignment_score")
      .eq("user_id", userId).order("date", { ascending: false }).limit(3),
    supabase.from("habit_streaks").select("habit_name, current_streak, last_completed")
      .eq("user_id", userId).order("current_streak", { ascending: false }).limit(5),
  ]);

  const emotions = emotionsRes.data || [];
  const tasks = tasksRes.data || [];
  const momentum = momentumRes.data || [];
  const streaks = streaksRes.data || [];

  // 1. Emotional Interventions
  const recentEmotion = emotions[0];
  if (recentEmotion) {
    if (recentEmotion.valence < -0.5 && recentEmotion.intensity > 0.6) {
      interventions.push({
        type: "coaching",
        priority: "high",
        title: "I notice you're feeling down",
        message: `You seem to be experiencing ${recentEmotion.detected_emotion}. Would you like to talk about it, or try a quick grounding exercise?`,
        action_type: "open_confidant",
        trigger_reason: "negative_emotion_detected",
      });
    } else if (recentEmotion.valence > 0.5 && recentEmotion.intensity > 0.7) {
      interventions.push({
        type: "celebration",
        priority: "low",
        title: "Riding high! 🎉",
        message: `You're feeling ${recentEmotion.detected_emotion}! Great time to tackle that challenging task you've been putting off.`,
        action_type: "suggest_task",
        trigger_reason: "positive_emotion_peak",
      });
    }
  }

  // 2. Task Interventions
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < now);
  if (overdueTasks.length > 0) {
    interventions.push({
      type: "alert",
      priority: "high",
      title: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""}`,
      message: `"${overdueTasks[0].title}" is overdue. Want me to help you reschedule or break it down?`,
      action_type: "reschedule_task",
      action_data: { task_id: overdueTasks[0].id },
      trigger_reason: "overdue_tasks",
    });
  }

  const highPriorityPending = tasks.filter(t => t.priority === "high");
  if (highPriorityPending.length >= 3) {
    interventions.push({
      type: "nudge",
      priority: "medium",
      title: "High priority backlog building",
      message: `You have ${highPriorityPending.length} high-priority tasks pending. Consider blocking focused time to make progress.`,
      action_type: "start_focus_session",
      trigger_reason: "high_priority_backlog",
    });
  }

  // 3. Identity/Momentum Interventions
  if (momentum.length >= 2) {
    const recentMomentum = momentum[0]?.net_momentum || 0;
    const previousMomentum = momentum[1]?.net_momentum || 0;
    
    if (recentMomentum < -0.3 && previousMomentum < -0.3) {
      interventions.push({
        type: "reflection",
        priority: "medium",
        title: "Identity drift detected",
        message: "Your recent actions haven't aligned with your core values. Would you like to review your values or adjust your priorities?",
        action_type: "open_identity",
        trigger_reason: "identity_drift",
      });
    }
  }

  // 4. Streak Interventions
  const today = now.toISOString().split("T")[0];
  const streaksAtRisk = streaks.filter(s => {
    if (!s.last_completed) return false;
    const lastDate = s.last_completed.split("T")[0];
    return lastDate !== today && s.current_streak > 3;
  });

  if (streaksAtRisk.length > 0) {
    const topStreak = streaksAtRisk[0];
    interventions.push({
      type: "alert",
      priority: "high",
      title: `${topStreak.current_streak}-day streak at risk! 🔥`,
      message: `Don't lose your ${topStreak.habit_name} streak! Complete it now to keep the momentum.`,
      action_type: "complete_habit",
      action_data: { habit_name: topStreak.habit_name },
      trigger_reason: "streak_at_risk",
    });
  }

  // 5. Time-based interventions
  const hour = now.getHours();
  if (hour >= 21 && hour < 23) {
    const completedToday = tasks.filter(t => t.status === "completed").length;
    if (completedToday > 0) {
      interventions.push({
        type: "reflection",
        priority: "low",
        title: "End of day reflection",
        message: `You completed ${completedToday} tasks today. Take a moment to reflect on your wins and set intentions for tomorrow.`,
        action_type: "open_journal",
        trigger_reason: "evening_reflection",
      });
    }
  }

  return interventions;
}

export async function storeIntervention(userId: string, intervention: Intervention): Promise<string | null> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase.from("proactive_interventions").insert({
    user_id: userId,
    ...intervention,
    status: "pending",
    created_at: new Date().toISOString(),
  }).select("id").single();

  if (error) {
    console.error("Failed to store intervention:", error);
    return null;
  }

  return data.id;
}

export async function dismissIntervention(userId: string, interventionId: string, action: "dismissed" | "completed" | "snoozed"): Promise<boolean> {
  const supabase = getSupabase();
  
  const { error } = await supabase
    .from("proactive_interventions")
    .update({ 
      status: action, 
      acted_at: new Date().toISOString() 
    })
    .eq("id", interventionId)
    .eq("user_id", userId);

  return !error;
}

export default { generateProactiveInterventions, storeIntervention, dismissIntervention };