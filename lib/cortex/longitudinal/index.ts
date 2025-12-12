// Longitudinal Life Model - Main API
// lib/cortex/longitudinal/index.ts

import { supabaseAdmin } from "@/lib/supabase";
import { LongitudinalSnapshot, LifeEvent, LifeChapter } from "./types";
import { buildLifeChapters } from "./chapter-builder";
import { analyzeLongitudinalPatterns } from "./pattern-analyzer";

/**
 * Build complete longitudinal model for user
 */
export async function buildLongitudinalModel(
  userId: string
): Promise<LongitudinalSnapshot> {
  try {
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();

    const dbUserId = userRow?.id || userId;

    // Load events from various sources
    const events = await loadLifeEvents(dbUserId);

    // Build chapters
    const chapters = buildLifeChapters(events);

    // Analyze patterns
    const patterns = analyzeLongitudinalPatterns(events);

    // Determine time range
    const timestamps = events.map((e) => new Date(e.timestamp).getTime());
    const start = new Date(Math.min(...timestamps)).toISOString();
    const end = new Date(Math.max(...timestamps)).toISOString();

    return {
      userId: dbUserId,
      chapters,
      rawEvents: events,
      aggregatedPatterns: patterns,
      generatedAt: new Date().toISOString(),
      timeRange: { start, end },
    };
  } catch (err) {
    console.error("[Longitudinal] Failed to build model:", err);
    return {
      userId,
      chapters: [],
      rawEvents: [],
      aggregatedPatterns: [],
      generatedAt: new Date().toISOString(),
      timeRange: {
        start: new Date().toISOString(),
        end: new Date().toISOString(),
      },
    };
  }
}

/**
 * Load life events from various sources
 */
async function loadLifeEvents(userId: string): Promise<LifeEvent[]> {
  const events: LifeEvent[] = [];

  // Load from third_brain_events
  try {
    const { data: tbEvents } = await supabaseAdmin
      .from("third_brain_events")
      .select("id, type, source, title, summary, occurred_at, raw_payload")
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false })
      .limit(500); // Last 500 events

    if (tbEvents) {
      for (const event of tbEvents) {
        const domain = inferDomain(event.type, event.source);
        events.push({
          id: `tb_${event.id}`,
          timestamp: event.occurred_at,
          domain,
          type: event.type,
          description: event.title || event.summary || event.type,
          metadata: event.raw_payload || {},
        });
      }
    }
  } catch (err) {
    console.warn("[Longitudinal] Failed to load Third Brain events:", err);
  }

  // Load from emotion states
  try {
    const { data: emotionStates } = await supabaseAdmin
      .from("emo_states")
      .select("id, detected_emotion, intensity, occurred_at")
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false })
      .limit(200);

    if (emotionStates) {
      for (const state of emotionStates) {
        events.push({
          id: `emo_${state.id}`,
          timestamp: state.occurred_at,
          domain: "life",
          type: "emotion_checkin",
          description: `Emotion: ${state.detected_emotion}`,
          emotion: state.detected_emotion,
          intensity: state.intensity,
        });
      }
    }
  } catch (err) {
    console.warn("[Longitudinal] Failed to load emotion states:", err);
  }

  // Load from tasks (completed)
  try {
    const { data: tasks } = await supabaseAdmin
      .from("tasks")
      .select("id, title, completed_at, priority")
      .eq("user_id", userId)
      .eq("status", "completed")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(200);

    if (tasks) {
      for (const task of tasks) {
        events.push({
          id: `task_${task.id}`,
          timestamp: task.completed_at!,
          domain: "work",
          type: "task_completed",
          description: task.title,
          metadata: { priority: task.priority },
        });
      }
    }
  } catch (err) {
    console.warn("[Longitudinal] Failed to load tasks:", err);
  }

  // Sort all events chronologically
  return events.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/**
 * Infer domain from event type/source
 */
function inferDomain(type: string, source: string): LifeEvent["domain"] {
  const typeLower = type.toLowerCase();
  const sourceLower = source.toLowerCase();

  if (typeLower.includes("relationship") || typeLower.includes("contact")) {
    return "relationships";
  }
  if (typeLower.includes("finance") || typeLower.includes("money")) {
    return "finance";
  }
  if (typeLower.includes("health") || typeLower.includes("habit")) {
    return "health";
  }
  if (typeLower.includes("arc") || typeLower.includes("strategy")) {
    return "strategy";
  }
  if (typeLower.includes("work") || typeLower.includes("task") || typeLower.includes("project")) {
    return "work";
  }

  return "life";
}



