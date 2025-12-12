// Executive Function Telemetry & Learning Loop
// lib/productivity/telemetry.ts

import { supabaseAdmin } from "@/lib/supabase";
import { logThirdBrainEvent } from "@/lib/third-brain/service";

export type EFEventType =
  | "micro_step_completed"
  | "task_avoided"
  | "task_postponed"
  | "session_interrupted"
  | "ef_sequence_completed"
  | "autonomous_replan_triggered";

export interface EFEvent {
  userId: string;
  eventType: EFEventType;
  workItemId?: string;
  parentTaskId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

/**
 * Log an Executive Function event for learning
 */
export async function logEFEvent(event: EFEvent): Promise<void> {
  try {
    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", event.userId)
      .maybeSingle();

    const dbUserId = userRow?.id || event.userId;

    // Insert into executive_function_events table
    await supabaseAdmin.from("executive_function_events").insert({
      user_id: dbUserId,
      event_type: event.eventType,
      work_item_id: event.workItemId || null,
      parent_task_id: event.parentTaskId || null,
      session_id: event.sessionId || null,
      metadata: event.metadata || {},
      occurred_at: new Date().toISOString(),
    });

    // Also log to Third Brain for context
    await logThirdBrainEvent({
      userId: event.userId,
      type: `ef_${event.eventType}`,
      source: "productivity_engine",
      title: event.eventType.replace(/_/g, " "),
      summary: JSON.stringify(event.metadata),
      rawPayload: event.metadata || {},
    });
  } catch (err) {
    console.error("[EFTelemetry] Failed to log event:", err);
  }
}

/**
 * Get learning patterns from EF events
 */
export async function getEFLearningPatterns(userId: string): Promise<{
  avoidancePatterns: Array<{ taskType: string; count: number }>;
  completionPatterns: Array<{ timeOfDay: number; successRate: number }>;
  interruptionPatterns: Array<{ reason: string; count: number }>;
}> {
  try {
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();

    const dbUserId = userRow?.id || userId;

    // Get last 30 days of events
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: events } = await supabaseAdmin
      .from("executive_function_events")
      .select("*")
      .eq("user_id", dbUserId)
      .gte("occurred_at", thirtyDaysAgo);

    if (!events) {
      return {
        avoidancePatterns: [],
        completionPatterns: [],
        interruptionPatterns: [],
      };
    }

    // Analyze avoidance patterns
    const avoided = events.filter((e) => e.event_type === "task_avoided");
    const avoidanceMap = new Map<string, number>();
    for (const event of avoided) {
      const taskType = event.metadata?.taskType || "unknown";
      avoidanceMap.set(taskType, (avoidanceMap.get(taskType) || 0) + 1);
    }
    const avoidancePatterns = Array.from(avoidanceMap.entries()).map(([taskType, count]) => ({
      taskType,
      count,
    }));

    // Analyze completion patterns by time of day
    const completed = events.filter((e) => e.event_type === "micro_step_completed");
    const completionByHour = new Map<number, { total: number; completed: number }>();
    for (const event of completed) {
      const hour = new Date(event.occurred_at).getHours();
      const current = completionByHour.get(hour) || { total: 0, completed: 0 };
      completionByHour.set(hour, { total: current.total + 1, completed: current.completed + 1 });
    }
    const completionPatterns = Array.from(completionByHour.entries()).map(([hour, stats]) => ({
      timeOfDay: hour,
      successRate: stats.total > 0 ? stats.completed / stats.total : 0,
    }));

    // Analyze interruption patterns
    const interrupted = events.filter((e) => e.event_type === "session_interrupted");
    const interruptionMap = new Map<string, number>();
    for (const event of interrupted) {
      const reason = event.metadata?.reason || "unknown";
      interruptionMap.set(reason, (interruptionMap.get(reason) || 0) + 1);
    }
    const interruptionPatterns = Array.from(interruptionMap.entries()).map(([reason, count]) => ({
      reason,
      count,
    }));

    return {
      avoidancePatterns,
      completionPatterns,
      interruptionPatterns,
    };
  } catch (err) {
    console.error("[EFTelemetry] Failed to get learning patterns:", err);
    return {
      avoidancePatterns: [],
      completionPatterns: [],
      interruptionPatterns: [],
    };
  }
}



