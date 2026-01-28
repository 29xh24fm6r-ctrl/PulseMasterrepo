// intelligence/signals/userOverload.ts
// Signal: user_overload
// Rule: Many urgent signals + dense activity + late-night patterns.
// Confidence: 0.55. IMPORTANT: ask-first behavior only.

import { getSupabase } from "../../supabase.js";
import type { GeneratedSignal } from "../types.js";

const WINDOW_HOURS = 24;
const SIGNAL_DENSITY_THRESHOLD = 15;
const TRIGGER_DENSITY_THRESHOLD = 8;
const LATE_NIGHT_HOUR_START = 23; // 11 PM
const LATE_NIGHT_HOUR_END = 5; // 5 AM
const CONFIDENCE = 0.55;

export async function detectUserOverload(
  userId: string,
): Promise<GeneratedSignal[]> {
  const cutoff = new Date(
    Date.now() - WINDOW_HOURS * 60 * 60 * 1000,
  ).toISOString();

  // Count recent signals
  const [signalResult, triggerResult, lateNightResult] = await Promise.all([
    getSupabase()
      .from("pulse_signals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", cutoff),
    getSupabase()
      .from("pulse_trigger_candidates")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "pending")
      .gte("detected_at", cutoff),
    getSupabase()
      .from("pulse_observer_events")
      .select("id, created_at")
      .eq("user_id", userId)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const signalCount = signalResult.count ?? 0;
  const triggerCount = triggerResult.count ?? 0;
  const lateNightEvents = lateNightResult.data ?? [];

  // Check for late-night activity
  let lateNightCount = 0;
  for (const event of lateNightEvents) {
    const hour = new Date(event.created_at).getHours();
    if (hour >= LATE_NIGHT_HOUR_START || hour < LATE_NIGHT_HOUR_END) {
      lateNightCount++;
    }
  }

  const isHighDensity =
    signalCount >= SIGNAL_DENSITY_THRESHOLD ||
    triggerCount >= TRIGGER_DENSITY_THRESHOLD;
  const hasLateNight = lateNightCount >= 3;

  if (!isHighDensity && !hasLateNight) return [];

  const reasons: string[] = [];
  if (signalCount >= SIGNAL_DENSITY_THRESHOLD)
    reasons.push(`${signalCount} signals in ${WINDOW_HOURS}h`);
  if (triggerCount >= TRIGGER_DENSITY_THRESHOLD)
    reasons.push(`${triggerCount} pending triggers`);
  if (hasLateNight)
    reasons.push(`${lateNightCount} late-night events`);

  const eventIds: string[] = [];
  if (lateNightEvents.length > 0)
    eventIds.push(...lateNightEvents.slice(0, 10).map((e) => e.id));

  return [
    {
      signal_type: "user_overload",
      summary: `Possible overload: ${reasons.join(", ")}`,
      confidence: CONFIDENCE,
      evidence: { event_ids: eventIds },
      first_detected_at: cutoff,
      last_detected_at: new Date().toISOString(),
    },
  ];
}
