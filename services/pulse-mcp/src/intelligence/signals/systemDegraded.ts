// intelligence/signals/systemDegraded.ts
// Signal: system_degraded
// Rule: schema_health or smoke_test fail, OR repeated tool failures in observer logs.
// Reads pulse_observer_events for error-status tool calls.
// Confidence: 0.9

import { getSupabase } from "../../supabase.js";
import type { GeneratedSignal } from "../types.js";

const WINDOW_MINUTES = 30;
const ERROR_THRESHOLD = 5;
const CONFIDENCE = 0.9;

export async function detectSystemDegraded(
  userId: string,
): Promise<GeneratedSignal[]> {
  const cutoff = new Date(
    Date.now() - WINDOW_MINUTES * 60 * 1000,
  ).toISOString();

  // Query recent observer events for tool call errors
  const { data: events, error } = await getSupabase()
    .from("pulse_observer_events")
    .select("id, payload, created_at")
    .eq("event_type", "mcp_tool_call")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !events || events.length === 0) return [];

  // Count errors
  const errorEvents: string[] = [];
  const failedTools = new Set<string>();

  for (const event of events) {
    const payload = event.payload as Record<string, unknown> | null;
    if (!payload) continue;

    if (payload.status === "error") {
      errorEvents.push(event.id);
      if (payload.tool) failedTools.add(payload.tool as string);
    }
  }

  if (errorEvents.length < ERROR_THRESHOLD) return [];

  const errorRate = errorEvents.length / events.length;
  const toolList = Array.from(failedTools).join(", ");

  return [
    {
      signal_type: "system_degraded",
      summary: `${errorEvents.length} tool errors in ${WINDOW_MINUTES}min (${Math.round(errorRate * 100)}% error rate). Failing: ${toolList}`,
      confidence: CONFIDENCE,
      evidence: { event_ids: errorEvents.slice(0, 20) },
      first_detected_at: events[events.length - 1].created_at,
      last_detected_at: events[0].created_at,
    },
  ];
}
