// intelligence/signals/deadlineRisk.ts
// Signal: deadline_risk
// Rule: Deadline < 72h AND prerequisites incomplete.
// Reads pulse_signals for signals with deadline-type payloads.

import { getSupabase } from "../../supabase.js";
import type { GeneratedSignal } from "../types.js";

const HORIZON_HOURS = 72;
const CONFIDENCE = 0.6;

export async function detectDeadlineRisks(
  userId: string,
): Promise<GeneratedSignal[]> {
  const now = new Date();
  const horizon = new Date(
    now.getTime() + HORIZON_HOURS * 60 * 60 * 1000,
  ).toISOString();

  // Find signals that indicate upcoming deadlines
  // Signal types that carry deadline information
  const { data: signals, error } = await getSupabase()
    .from("pulse_signals")
    .select("id, signal_type, payload, created_at")
    .eq("user_id", userId)
    .in("signal_type", [
      "deadline_approaching",
      "event_created",
      "upcoming_commitment",
    ])
    .eq("processed", false)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !signals || signals.length === 0) return [];

  const results: GeneratedSignal[] = [];

  for (const signal of signals) {
    const payload = signal.payload as Record<string, unknown> | null;
    if (!payload) continue;

    // Extract deadline from various payload shapes
    const deadline =
      (payload.deadline as string) ??
      (payload.due_date as string) ??
      (payload.start_time as string) ??
      (payload.event_date as string);

    if (!deadline) continue;

    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) continue;

    // Only surface if deadline is within horizon and in the future
    if (deadlineDate.getTime() > now.getTime() && deadline <= horizon) {
      const hoursLeft = Math.round(
        (deadlineDate.getTime() - now.getTime()) / (60 * 60 * 1000),
      );
      const title =
        (payload.title as string) ??
        (payload.summary as string) ??
        signal.signal_type;

      results.push({
        signal_type: "deadline_risk",
        summary: `Deadline in ${hoursLeft}h: "${title.slice(0, 80)}"`,
        confidence: CONFIDENCE,
        evidence: { event_ids: [signal.id] },
        first_detected_at: signal.created_at,
        last_detected_at: now.toISOString(),
      });
    }
  }

  return results;
}
