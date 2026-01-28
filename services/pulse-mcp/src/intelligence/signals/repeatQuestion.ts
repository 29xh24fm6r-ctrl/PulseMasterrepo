// intelligence/signals/repeatQuestion.ts
// Signal: repeat_question_3x_7d
// Rule: Same topic/question >= 3 times in 7 days.
// Reads pulse_memory_events for repeated content themes.
// Hashes normalized content → topic_hash, groups by hash, emits if count >= 3.

import crypto from "node:crypto";
import { getSupabase } from "../../supabase.js";
import type { GeneratedSignal } from "../types.js";

const WINDOW_DAYS = 7;
const MIN_OCCURRENCES = 3;
const CONFIDENCE = 0.65;

function hashTopic(text: string): string {
  return crypto
    .createHash("sha256")
    .update(text.toLowerCase().trim())
    .digest("hex")
    .slice(0, 16);
}

export async function detectRepeatQuestions(
  userId: string,
): Promise<GeneratedSignal[]> {
  const cutoff = new Date(
    Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: memories, error } = await getSupabase()
    .from("pulse_memory_events")
    .select("id, content, created_at")
    .eq("user_id", userId)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !memories || memories.length === 0) return [];

  // Group by topic hash
  const groups = new Map<
    string,
    { ids: string[]; content: string; timestamps: string[] }
  >();

  for (const mem of memories) {
    const hash = hashTopic(mem.content);
    let group = groups.get(hash);
    if (!group) {
      group = { ids: [], content: mem.content, timestamps: [] };
      groups.set(hash, group);
    }
    group.ids.push(mem.id);
    group.timestamps.push(mem.created_at);
  }

  const signals: GeneratedSignal[] = [];

  for (const [hash, group] of groups) {
    if (group.ids.length >= MIN_OCCURRENCES) {
      const sorted = group.timestamps.sort();
      signals.push({
        signal_type: "repeat_question_3x_7d",
        summary: `Topic repeated ${group.ids.length}x in ${WINDOW_DAYS}d: "${group.content.slice(0, 80)}"`,
        confidence: CONFIDENCE,
        evidence: { event_ids: group.ids },
        first_detected_at: sorted[0],
        last_detected_at: sorted[sorted.length - 1],
        topic_hash: hash,
      });
    }
  }

  return signals;
}
