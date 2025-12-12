// Behavior Prediction Engine
// lib/prediction/engine.ts

import { supabaseAdmin } from "@/lib/supabase";
import { getTopPowerPatterns } from "@/lib/patterns/engine";
import { BehaviorPrediction, RiskType, WindowContext } from "./types";
import { getTimeOfDayKey, getWeekdayKey } from "@/lib/patterns/engine";

/**
 * Load upcoming windows (calendar events, task blocks, etc.)
 */
async function loadUpcomingWindows(userId: string, date: Date): Promise<WindowContext[]> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const windows: WindowContext[] = [];

  // Load calendar events for today
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: events } = await supabaseAdmin
      .from("calendar_events_cache")
      .select("*")
      .eq("user_id", dbUserId)
      .gte("start_time", startOfDay.toISOString())
      .lte("start_time", endOfDay.toISOString())
      .order("start_time", { ascending: true });

    for (const event of events || []) {
      const start = new Date(event.start_time);
      const end = event.end_time ? new Date(event.end_time) : new Date(start.getTime() + 60 * 60 * 1000); // Default 1 hour

      windows.push({
        window_start: start.toISOString(),
        window_end: end.toISOString(),
        context: "calendar_event",
        context_id: event.id || event.event_id || "",
        tags: extractTagsFromEvent(event),
      });
    }
  } catch (err) {
    console.warn("[PredictionEngine] Failed to load calendar events:", err);
  }

  // Add generic time windows if no events (morning, afternoon, evening)
  if (windows.length === 0) {
    const morning = new Date(date);
    morning.setHours(9, 0, 0, 0);
    const afternoon = new Date(date);
    afternoon.setHours(14, 0, 0, 0);
    const evening = new Date(date);
    evening.setHours(18, 0, 0, 0);

    windows.push(
      {
        window_start: morning.toISOString(),
        window_end: new Date(morning.getTime() + 3 * 60 * 60 * 1000).toISOString(),
        context: "generic",
        context_id: "morning",
        tags: ["morning", "work"],
      },
      {
        window_start: afternoon.toISOString(),
        window_end: new Date(afternoon.getTime() + 3 * 60 * 60 * 1000).toISOString(),
        context: "generic",
        context_id: "afternoon",
        tags: ["afternoon", "work"],
      },
      {
        window_start: evening.toISOString(),
        window_end: new Date(evening.getTime() + 3 * 60 * 60 * 1000).toISOString(),
        context: "generic",
        context_id: "evening",
        tags: ["evening"],
      }
    );
  }

  return windows;
}

/**
 * Extract tags from calendar event
 */
function extractTagsFromEvent(event: any): string[] {
  const tags: string[] = [];
  const title = (event.title || event.summary || "").toLowerCase();
  const description = (event.description || "").toLowerCase();

  // Simple keyword matching
  if (title.includes("meeting") || title.includes("call")) tags.push("calls");
  if (title.includes("deep work") || title.includes("focus")) tags.push("deep_work");
  if (title.includes("sales") || title.includes("pipeline")) tags.push("sales");
  if (title.includes("review") || title.includes("planning")) tags.push("planning");
  if (title.includes("standup") || title.includes("sync")) tags.push("sync");

  return tags;
}

/**
 * Match pattern to window and compute risk
 */
function matchPatternToWindow(
  pattern: any,
  window: WindowContext,
  date: Date
): { riskType: RiskType | null; riskScore: number } | null {
  const windowStart = new Date(window.window_start);
  const windowTimeOfDay = getTimeOfDayKey(windowStart);
  const windowWeekday = getWeekdayKey(windowStart);

  // Check if pattern matches this window
  let matches = false;

  if (pattern.pattern_type === "time_of_day" && pattern.key === windowTimeOfDay) {
    matches = true;
  } else if (pattern.pattern_type === "weekday" && pattern.key === windowWeekday) {
    matches = true;
  } else if (pattern.pattern_type === "coach" && window.tags.includes(pattern.key)) {
    matches = true;
  }

  if (!matches) return null;

  // Determine risk type based on emotion
  let riskType: RiskType | null = null;
  const emotion = pattern.emotion_dominant?.toLowerCase();

  if (emotion === "stress" || emotion === "anxious" || emotion === "overwhelmed") {
    riskType = "stress_spike";
  } else if (emotion === "sad" || emotion === "down" || emotion === "low") {
    riskType = "slump";
  } else if (emotion === "angry" || emotion === "frustrated") {
    riskType = "overwhelm";
  } else if (window.tags.includes("deep_work") && emotion === "procrastination") {
    riskType = "procrastination";
  }

  if (!riskType) return null;

  // Compute risk score: pattern confidence * emotion score * sample size factor
  const sampleSizeFactor = Math.min(1, pattern.sample_size / 10);
  const riskScore = pattern.confidence * pattern.emotion_score * sampleSizeFactor;

  return { riskType, riskScore };
}

/**
 * Generate recommended action
 */
function generateRecommendedAction(riskType: RiskType, pattern: any, window: WindowContext): string {
  switch (riskType) {
    case "stress_spike":
      return "Pre-block 10-15 min wind-down before this window. Consider Confidant Coach for support.";
    case "procrastination":
      return "Set a clear micro-goal for this block. Warrior Coach can help push through.";
    case "overwhelm":
      return "Break this into smaller chunks. Executive Coach can help organize.";
    case "burnout":
      return "This is a high-risk window. Schedule a break or lighter work.";
    case "slump":
      return "Consider starting with a quick win or energizing activity. Hype Coach can help.";
    default:
      return "Be mindful of your patterns during this time.";
  }
}

/**
 * Generate behavior predictions for a user
 */
export async function generateBehaviorPredictionsForUser(
  userId: string,
  date: Date
): Promise<void> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // 1. Load top power patterns
  const patterns = await getTopPowerPatterns(userId, 20);

  if (patterns.length === 0) {
    console.log("[PredictionEngine] No patterns found for user, skipping predictions");
    return;
  }

  // 2. Load upcoming windows
  const windows = await loadUpcomingWindows(userId, date);

  // 3. Clear existing predictions for this date
  await supabaseAdmin
    .from("behavior_predictions")
    .delete()
    .eq("user_id", dbUserId)
    .eq("prediction_date", date.toISOString().split("T")[0]);

  // 4. Match patterns to windows and generate predictions
  const predictions: Omit<BehaviorPrediction, "id" | "created_at">[] = [];

  for (const window of windows) {
    let bestMatch: { riskType: RiskType; riskScore: number; pattern: any } | null = null;

    for (const pattern of patterns) {
      const match = matchPatternToWindow(pattern, window, date);
      if (match && match.riskType) {
        if (!bestMatch || match.riskScore > bestMatch.riskScore) {
          bestMatch = {
            riskType: match.riskType,
            riskScore: match.riskScore,
            pattern,
          };
        }
      }
    }

    if (bestMatch && bestMatch.riskScore > 0.3) {
      // Only create prediction if risk score is meaningful
      predictions.push({
        user_id: dbUserId,
        prediction_date: date.toISOString().split("T")[0],
        window_start: window.window_start,
        window_end: window.window_end,
        context: window.context,
        context_id: window.context_id,
        risk_type: bestMatch.riskType,
        risk_score: bestMatch.riskScore,
        recommended_action: generateRecommendedAction(bestMatch.riskType, bestMatch.pattern, window),
      });
    }
  }

  // 5. Insert predictions
  if (predictions.length > 0) {
    await supabaseAdmin.from("behavior_predictions").insert(predictions);
  }

  console.log(`[PredictionEngine] Generated ${predictions.length} predictions for ${date.toISOString().split("T")[0]}`);
}

/**
 * Get today's predictions
 */
export async function getTodayPredictions(userId: string): Promise<BehaviorPrediction[]> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const today = new Date().toISOString().split("T")[0];

  const { data: predictions } = await supabaseAdmin
    .from("behavior_predictions")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("prediction_date", today)
    .order("window_start", { ascending: true });

  return (predictions || []) as BehaviorPrediction[];
}

