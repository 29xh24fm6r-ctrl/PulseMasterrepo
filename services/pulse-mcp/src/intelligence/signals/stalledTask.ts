// intelligence/signals/stalledTask.ts
// Signal: stalled_task_defer_loop
// Rule: Same task deferred >= 3 times OR open > 14 days.
// Reads pulse_trigger_candidates for triggers stuck in pending state.

import { getSupabase } from "../../supabase.js";
import type { GeneratedSignal } from "../types.js";

const DEFER_THRESHOLD = 3;
const STALE_DAYS = 14;
const CONFIDENCE = 0.7;

export async function detectStalledTasks(
  userId: string,
): Promise<GeneratedSignal[]> {
  const staleCutoff = new Date(
    Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Find pending triggers that are either old or have been re-detected many times
  const { data: triggers, error } = await getSupabase()
    .from("pulse_trigger_candidates")
    .select("id, trigger_type, message, detected_at, meta, created_at")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("detected_at", { ascending: false })
    .limit(100);

  if (error || !triggers || triggers.length === 0) return [];

  const signals: GeneratedSignal[] = [];
  const now = Date.now();

  for (const trigger of triggers) {
    const createdAt = new Date(trigger.created_at).getTime();
    const ageMs = now - createdAt;
    const ageDays = ageMs / (24 * 60 * 60 * 1000);

    // Check if trigger has been re-detected (detected_at >> created_at means updates)
    const detectedAt = new Date(trigger.detected_at).getTime();
    const redetectionGap = detectedAt - createdAt;
    const redetections = redetectionGap > 0 ? Math.ceil(redetectionGap / (24 * 60 * 60 * 1000)) : 0;

    const isStale = ageDays >= STALE_DAYS;
    const isDeferLoop = redetections >= DEFER_THRESHOLD;

    if (isStale || isDeferLoop) {
      const reason = isDeferLoop
        ? `deferred ~${redetections}x`
        : `open ${Math.floor(ageDays)}d`;

      signals.push({
        signal_type: "stalled_task_defer_loop",
        summary: `Stalled task (${reason}): "${trigger.message.slice(0, 80)}"`,
        confidence: CONFIDENCE,
        evidence: { event_ids: [trigger.id] },
        first_detected_at: trigger.created_at,
        last_detected_at: trigger.detected_at,
      });
    }
  }

  return signals;
}
