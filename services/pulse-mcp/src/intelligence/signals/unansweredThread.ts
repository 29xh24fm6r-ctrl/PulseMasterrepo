// intelligence/signals/unansweredThread.ts
// Signal: unanswered_thread_risk
// Rule: Outbound message sent, no reply after baseline response window.
// Reads pulse_signals for outbound message signals without matching replies.
// Confidence starts at 0.55, increases with history.

import { getSupabase } from "../../supabase.js";
import type { GeneratedSignal } from "../types.js";

const BASELINE_WINDOW_HOURS = 48;
const BASE_CONFIDENCE = 0.55;

export async function detectUnansweredThreads(
  userId: string,
): Promise<GeneratedSignal[]> {
  const cutoff = new Date(
    Date.now() - BASELINE_WINDOW_HOURS * 60 * 60 * 1000,
  ).toISOString();

  // Find outbound message signals older than the baseline window
  const { data: outbound, error } = await getSupabase()
    .from("pulse_signals")
    .select("id, payload, created_at")
    .eq("user_id", userId)
    .in("signal_type", ["message_sent", "email_sent", "message_received"])
    .eq("processed", false)
    .lte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !outbound || outbound.length === 0) return [];

  const results: GeneratedSignal[] = [];

  for (const msg of outbound) {
    const payload = msg.payload as Record<string, unknown> | null;
    if (!payload) continue;

    // Only process outbound messages (direction = 'outbound')
    const direction = payload.direction as string;
    if (direction !== "outbound" && direction !== "sent") continue;

    const threadId =
      (payload.thread_id as string) ??
      (payload.conversation_id as string);
    if (!threadId) continue;

    // Check if there's a reply in the same thread after this message
    const { data: replies } = await getSupabase()
      .from("pulse_signals")
      .select("id")
      .eq("user_id", userId)
      .in("signal_type", ["message_received", "email_received", "reply_received"])
      .gt("created_at", msg.created_at)
      .limit(1)
      .maybeSingle();

    if (!replies) {
      const ageHours = Math.round(
        (Date.now() - new Date(msg.created_at).getTime()) / (60 * 60 * 1000),
      );
      // Confidence increases with age
      const confidence = Math.min(
        0.9,
        BASE_CONFIDENCE + (ageHours - BASELINE_WINDOW_HOURS) * 0.005,
      );

      const recipient =
        (payload.recipient as string) ??
        (payload.to as string) ??
        "unknown";

      results.push({
        signal_type: "unanswered_thread_risk",
        summary: `No reply in ${ageHours}h to ${recipient.slice(0, 40)}`,
        confidence,
        evidence: { event_ids: [msg.id] },
        first_detected_at: msg.created_at,
        last_detected_at: new Date().toISOString(),
      });
    }
  }

  return results;
}
