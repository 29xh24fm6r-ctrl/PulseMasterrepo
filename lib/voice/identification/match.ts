// Speaker Identification - Match to Known Profiles
// lib/voice/identification/match.ts

import { supabaseAdmin } from "@/lib/supabase";
import { cosineSimilarity } from "../utils/vector";

export interface SpeakerMatch {
  profileId: string | null;
  contactId: string | null;
  contactName: string | null;
  confidence: number;
  isKnown: boolean;
}

/**
 * Match speaker embedding to known voice profiles
 */
export async function matchSpeakerEmbeddingToProfiles(
  userId: string,
  embedding: number[]
): Promise<SpeakerMatch> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Get user's voice identification settings
  const { data: settings } = await supabaseAdmin
    .from("user_voice_identity_settings")
    .select("auto_identify_threshold")
    .eq("user_id", dbUserId)
    .maybeSingle();

  const threshold = settings?.auto_identify_threshold || 0.85;

  // Load all voice profiles for user
  const { data: profiles } = await supabaseAdmin
    .from("voice_profiles")
    .select("id, contact_id, contact_name, embedding")
    .eq("user_id", dbUserId)
    .not("embedding", "is", null);

  if (!profiles || profiles.length === 0) {
    return {
      profileId: null,
      contactId: null,
      contactName: null,
      confidence: 0,
      isKnown: false,
    };
  }

  // Compute cosine similarity for each profile
  let bestMatch: SpeakerMatch = {
    profileId: null,
    contactId: null,
    contactName: null,
    confidence: 0,
    isKnown: false,
  };

  for (const profile of profiles) {
    if (!profile.embedding || !Array.isArray(profile.embedding)) {
      continue;
    }

    const similarity = cosineSimilarity(embedding, profile.embedding as number[]);

    if (similarity > bestMatch.confidence) {
      bestMatch = {
        profileId: profile.id,
        contactId: profile.contact_id || null,
        contactName: profile.contact_name || null,
        confidence: similarity,
        isKnown: similarity >= threshold,
      };
    }
  }

  return bestMatch;
}

