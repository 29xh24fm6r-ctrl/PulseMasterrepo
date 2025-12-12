// Speaker Identification - Match to Unknown Speakers
// lib/voice/identification/match-unknown.ts

import { supabaseAdmin } from "@/lib/supabase";
import { cosineSimilarity } from "../utils/vector";

export interface UnknownSpeakerMatch {
  unknownId: string | null;
  confidence: number;
  label: string | null;
}

/**
 * Match speaker embedding to unknown speaker profiles
 */
export async function matchToUnknownSpeakers(
  userId: string,
  embedding: number[]
): Promise<UnknownSpeakerMatch> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Load all unknown speakers for user
  const { data: unknownSpeakers } = await supabaseAdmin
    .from("voice_unknown_speakers")
    .select("id, embedding, label")
    .eq("user_id", dbUserId)
    .not("embedding", "is", null);

  if (!unknownSpeakers || unknownSpeakers.length === 0) {
    return {
      unknownId: null,
      confidence: 0,
      label: null,
    };
  }

  // Compute cosine similarity for each unknown speaker
  let bestMatch: UnknownSpeakerMatch = {
    unknownId: null,
    confidence: 0,
    label: null,
  };

  const threshold = 0.75; // Lower threshold for unknown matching

  for (const unknown of unknownSpeakers) {
    if (!unknown.embedding || !Array.isArray(unknown.embedding)) {
      continue;
    }

    const similarity = cosineSimilarity(embedding, unknown.embedding as number[]);

    if (similarity > bestMatch.confidence && similarity >= threshold) {
      bestMatch = {
        unknownId: unknown.id,
        confidence: similarity,
        label: unknown.label || null,
      };
    }
  }

  return bestMatch;
}

/**
 * Create a new unknown speaker profile
 */
export async function createNewUnknownSpeaker(
  userId: string,
  embedding: number[]
): Promise<string> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Count existing unknown speakers to generate label
  const { data: existing } = await supabaseAdmin
    .from("voice_unknown_speakers")
    .select("id")
    .eq("user_id", dbUserId);

  const count = (existing || []).length;
  const label = `Unknown ${String.fromCharCode(65 + count)}`; // A, B, C, etc.

  const { data: newUnknown } = await supabaseAdmin
    .from("voice_unknown_speakers")
    .insert({
      user_id: dbUserId,
      embedding: embedding,
      label: label,
      occurrence_count: 1,
    })
    .select("id")
    .single();

  if (!newUnknown) {
    throw new Error("Failed to create unknown speaker");
  }

  return newUnknown.id;
}

/**
 * Update unknown speaker (increment count, update last_seen)
 */
export async function updateUnknownSpeaker(
  unknownId: string,
  embedding: number[]
): Promise<void> {
  await supabaseAdmin
    .from("voice_unknown_speakers")
    .update({
      embedding: embedding, // Update embedding with latest
      last_seen: new Date().toISOString(),
      occurrence_count: supabaseAdmin.raw("occurrence_count + 1"),
    })
    .eq("id", unknownId);
}

