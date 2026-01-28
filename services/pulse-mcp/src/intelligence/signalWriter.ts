// intelligence/signalWriter.ts
// Deduped signal writer — writes to pulse_signals with dedup on (signal_type, user_id, topic_hash?).
// Never throws. Returns the signal ID or null on failure.

import { getSupabase } from "../supabase.js";
import type { GeneratedSignal } from "./types.js";

/**
 * Write a generated signal to pulse_signals with dedup.
 * If a matching unprocessed signal exists, updates last_detected_at.
 * Otherwise inserts a new signal.
 * Never throws — returns null on failure.
 */
export async function writeSignal(
  userId: string,
  signal: GeneratedSignal,
): Promise<string | null> {
  try {
    // Build dedup query
    let query = getSupabase()
      .from("pulse_signals")
      .select("id, payload")
      .eq("user_id", userId)
      .eq("signal_type", signal.signal_type)
      .eq("source", "intelligence")
      .eq("processed", false)
      .limit(1);

    // Add topic_hash filter if present
    if (signal.topic_hash) {
      query = query.contains("metadata", { topic_hash: signal.topic_hash });
    }

    const { data: existing } = await query.maybeSingle();

    if (existing) {
      // Update existing signal: bump last_detected_at and confidence
      const existingPayload =
        typeof existing.payload === "object" ? existing.payload : {};
      await getSupabase()
        .from("pulse_signals")
        .update({
          payload: {
            ...existingPayload,
            last_detected_at: new Date().toISOString(),
            confidence: signal.confidence,
            summary: signal.summary,
            evidence: signal.evidence,
          },
        })
        .eq("id", existing.id);

      return existing.id;
    }

    // Insert new signal
    const { data, error } = await getSupabase()
      .from("pulse_signals")
      .insert({
        user_id: userId,
        source: "intelligence",
        signal_type: signal.signal_type,
        payload: {
          summary: signal.summary,
          confidence: signal.confidence,
          evidence: signal.evidence,
          first_detected_at: signal.first_detected_at,
          last_detected_at: signal.last_detected_at,
          topic_hash: signal.topic_hash ?? null,
        },
        metadata: signal.topic_hash ? { topic_hash: signal.topic_hash } : {},
        processed: false,
      })
      .select("id")
      .single();

    if (error) return null;
    return data.id;
  } catch {
    return null;
  }
}
