// Routine Discovery Engine
// lib/agi/perception/routines.ts

import { supabaseAdmin } from "@/lib/supabase";

export interface RoutineProfile {
  bestFocusWindow: {
    startHour: number; // 0-23
    endHour: number;
    confidence: number; // 0-1
  };
  lowEnergyWindow: {
    startHour: number;
    endHour: number;
  };
  socialWindow: {
    startHour: number;
    endHour: number;
  };
  avoidanceWindow: {
    startHour: number;
    endHour: number;
    pattern: string; // e.g. "Monday mornings", "Friday afternoons"
  };
  typicalWakeTime?: number; // Hour (0-23)
  typicalSleepTime?: number; // Hour (0-23)
  highPerformanceDays?: number[]; // Day of week (0-6)
  highStressDays?: number[]; // Day of week (0-6)
}

/**
 * Analyze patterns over last N weeks to discover routines
 */
export async function discoverRoutines(
  userId: string,
  weeks: number = 4
): Promise<RoutineProfile> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - weeks * 7);

  // Default profile
  const profile: RoutineProfile = {
    bestFocusWindow: { startHour: 9, endHour: 12, confidence: 0.5 },
    lowEnergyWindow: { startHour: 14, endHour: 16 },
    socialWindow: { startHour: 17, endHour: 20 },
    avoidanceWindow: { startHour: 8, endHour: 10, pattern: "mornings" },
  };

  try {
    // Analyze task completion patterns by hour
    const { data: completedTasks } = await supabaseAdmin
      .from("tasks")
      .select("completed_at, priority")
      .eq("user_id", dbUserId)
      .eq("status", "done")
      .gte("completed_at", startDate.toISOString())
      .not("completed_at", "is", null);

    if (completedTasks && completedTasks.length > 10) {
      // Group by hour
      const hourCounts: Record<number, { total: number; highPriority: number }> = {};
      for (const task of completedTasks) {
        const hour = new Date(task.completed_at).getHours();
        if (!hourCounts[hour]) {
          hourCounts[hour] = { total: 0, highPriority: 0 };
        }
        hourCounts[hour].total++;
        if (task.priority && parseFloat(task.priority) > 0.7) {
          hourCounts[hour].highPriority++;
        }
      }

      // Find best focus window (most high-priority completions)
      let bestStart = 9;
      let bestEnd = 12;
      let bestScore = 0;

      for (let start = 6; start <= 18; start++) {
        for (let end = start + 2; end <= 20; end++) {
          let score = 0;
          for (let h = start; h < end; h++) {
            const count = hourCounts[h];
            if (count) {
              score += count.highPriority * 2 + count.total;
            }
          }
          if (score > bestScore) {
            bestScore = score;
            bestStart = start;
            bestEnd = end;
          }
        }
      }

      profile.bestFocusWindow = {
        startHour: bestStart,
        endHour: bestEnd,
        confidence: Math.min(1, completedTasks.length / 50), // More data = higher confidence
      };
    }

    // Analyze task rescheduling patterns (avoidance)
    const { data: rescheduledTasks } = await supabaseAdmin
      .from("tasks")
      .select("due_date, updated_at")
      .eq("user_id", dbUserId)
      .gte("updated_at", startDate.toISOString());

    if (rescheduledTasks && rescheduledTasks.length > 5) {
      const rescheduleHours: Record<number, number> = {};
      for (const task of rescheduledTasks) {
        if (task.due_date && task.updated_at) {
          const dueHour = new Date(task.due_date).getHours();
          rescheduleHours[dueHour] = (rescheduleHours[dueHour] || 0) + 1;
        }
      }

      // Find avoidance window (most reschedules)
      const avoidanceHour = Object.entries(rescheduleHours).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (avoidanceHour) {
        profile.avoidanceWindow = {
          startHour: parseInt(avoidanceHour),
          endHour: parseInt(avoidanceHour) + 2,
          pattern: getHourPattern(parseInt(avoidanceHour)),
        };
      }
    }

    // Analyze day-of-week patterns
    const dayCompletions: Record<number, number> = {};
    const dayStress: Record<number, number> = {};

    if (completedTasks) {
      for (const task of completedTasks) {
        const day = new Date(task.completed_at).getDay();
        dayCompletions[day] = (dayCompletions[day] || 0) + 1;
      }
    }

    // Get emotion states by day
    try {
      const { data: emotionStates } = await supabaseAdmin
        .from("emo_states")
        .select("occurred_at, intensity, detected_emotion")
        .eq("user_id", dbUserId)
        .gte("occurred_at", startDate.toISOString());

      if (emotionStates) {
        for (const state of emotionStates) {
          const day = new Date(state.occurred_at).getDay();
          const isStressed = state.detected_emotion?.includes("stressed") || state.detected_emotion?.includes("overwhelmed");
          if (isStressed) {
            dayStress[day] = (dayStress[day] || 0) + (state.intensity || 0.5);
          }
        }
      }
    } catch {
      // Emotion data may not exist
    }

    // Find high-performance days (most completions)
    const highPerfDays = Object.entries(dayCompletions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([day]) => parseInt(day));
    if (highPerfDays.length > 0) {
      profile.highPerformanceDays = highPerfDays;
    }

    // Find high-stress days
    const highStressDays = Object.entries(dayStress)
      .filter(([_, stress]) => stress > 2)
      .map(([day]) => parseInt(day));
    if (highStressDays.length > 0) {
      profile.highStressDays = highStressDays;
    }

    // Infer low-energy window (typically afternoon)
    profile.lowEnergyWindow = { startHour: 14, endHour: 16 };

    // Infer social window (typically evening)
    profile.socialWindow = { startHour: 17, endHour: 20 };
  } catch (err: any) {
    console.warn("Routine discovery failed:", err.message);
  }

  return profile;
}

function getHourPattern(hour: number): string {
  if (hour >= 6 && hour < 12) return "mornings";
  if (hour >= 12 && hour < 17) return "afternoons";
  if (hour >= 17 && hour < 22) return "evenings";
  return "late night";
}



