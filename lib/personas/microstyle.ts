// Persona Micro-Style Preferences
// lib/personas/microstyle.ts

import { supabaseAdmin } from "@/lib/supabase";

export interface MicrostylePrefs {
  nickname?: string;
  preferredAddress?: "first_name" | "no_name" | "formal";
  forbiddenPhrases: string[];
  favoritePhrases: string[];
}

/**
 * Get microstyle preferences
 */
export async function getMicrostylePrefs(
  userId: string,
  personaId: string,
  coachId?: string
): Promise<MicrostylePrefs> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  if (!userRow) {
    return {
      forbiddenPhrases: [],
      favoritePhrases: [],
    };
  }

  const dbUserId = userRow.id;

  const { data: prefs } = await supabaseAdmin
    .from("persona_microstyle_prefs")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("persona_id", personaId)
    .eq("coach_id", coachId || null)
    .maybeSingle();

  if (!prefs) {
    return {
      forbiddenPhrases: [],
      favoritePhrases: [],
    };
  }

  return {
    nickname: prefs.nickname || undefined,
    preferredAddress: (prefs.preferred_address as any) || undefined,
    forbiddenPhrases: prefs.forbidden_phrases || [],
    favoritePhrases: prefs.favorite_phrases || [],
  };
}

/**
 * Update microstyle preferences
 */
export async function updateMicrostylePrefs(params: {
  userId: string;
  personaId: string;
  coachId?: string;
  nickname?: string;
  preferredAddress?: "first_name" | "no_name" | "formal";
  forbiddenPhrases?: string[];
  favoritePhrases?: string[];
}): Promise<void> {
  const { userId, personaId, coachId, nickname, preferredAddress, forbiddenPhrases, favoritePhrases } = params;

  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  if (!userRow) return;

  const dbUserId = userRow.id;

  await supabaseAdmin
    .from("persona_microstyle_prefs")
    .upsert(
      {
        user_id: dbUserId,
        persona_id: personaId,
        coach_id: coachId || null,
        nickname: nickname || null,
        preferred_address: preferredAddress || null,
        forbidden_phrases: forbiddenPhrases || [],
        favorite_phrases: favoritePhrases || [],
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,persona_id,coach_id",
      }
    );
}

/**
 * Apply microstyle to text
 */
export function applyMicrostyleToText(
  text: string,
  prefs: MicrostylePrefs,
  userName?: string
): string {
  let result = text;

  // Remove forbidden phrases
  for (const phrase of prefs.forbiddenPhrases) {
    const regex = new RegExp(phrase, "gi");
    result = result.replace(regex, "");
  }

  // Apply preferred address
  if (prefs.preferredAddress === "first_name" && userName) {
    // Replace generic "you" with name sparingly (not every instance)
    const youRegex = /\b(you|your)\b/gi;
    const matches = result.match(youRegex);
    if (matches && matches.length > 0) {
      // Replace ~20% of "you" with name
      const replaceCount = Math.floor(matches.length * 0.2);
      let count = 0;
      result = result.replace(youRegex, (match) => {
        if (count < replaceCount) {
          count++;
          return match === "you" ? userName : `${userName}'s`;
        }
        return match;
      });
    }
  } else if (prefs.preferredAddress === "no_name") {
    // Remove any name references
    if (userName) {
      const nameRegex = new RegExp(`\\b${userName}\\b`, "gi");
      result = result.replace(nameRegex, "");
    }
  }

  // Occasionally use favorite phrases (max 1 per response)
  if (prefs.favoritePhrases.length > 0 && Math.random() < 0.3) {
    const favoritePhrase = prefs.favoritePhrases[Math.floor(Math.random() * prefs.favoritePhrases.length)];
    // Add at end if appropriate
    if (!result.includes(favoritePhrase)) {
      result += ` ${favoritePhrase}`;
    }
  }

  return result.trim();
}




