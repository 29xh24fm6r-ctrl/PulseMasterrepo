// Mythic Coach Voice Persona v1 - Voice Selector
// lib/mythic_coach/voice/selector.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface MythicVoiceContext {
  userId: string;
  archetypeId?: string | null;
  mode?: 'grow' | 'stabilize' | 'cool' | null;
  emotionalLoad?: 'stressed' | 'calm' | 'overwhelmed' | 'hyped' | null;
  intensityHint?: 'soft' | 'balanced' | 'intense' | null;
}

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function selectMythicVoiceProfile(
  ctx: MythicVoiceContext
): Promise<{ voiceProfileId: string | null; styleOverrides: any }> {
  const { userId, archetypeId, mode, intensityHint } = ctx;
  const dbUserId = await resolveUserId(userId);

  // 1) User-specific mapping for this archetype+mode
  const { data: userMappings } = await supabaseAdmin
    .from('mythic_voice_mappings')
    .select('*')
    .eq('user_id', dbUserId)
    .order('updated_at', { ascending: false });

  const candidates: any[] = [];

  if (userMappings && userMappings.length) {
    for (const m of userMappings) {
      if (archetypeId && m.archetype_id && m.archetype_id !== archetypeId) continue;
      if (mode && m.mode && m.mode !== mode) continue;
      if (intensityHint && m.intensity && m.intensity !== intensityHint) continue;
      candidates.push(m);
    }
  }

  // 2) System-level default mappings
  const { data: systemMappings } = await supabaseAdmin
    .from('mythic_voice_mappings')
    .select('*')
    .is('user_id', null);

  if (systemMappings && systemMappings.length) {
    for (const m of systemMappings) {
      if (archetypeId && m.archetype_id && m.archetype_id !== archetypeId) continue;
      if (mode && m.mode && m.mode !== mode) continue;
      if (intensityHint && m.intensity && m.intensity !== intensityHint) continue;
      candidates.push(m);
    }

    // also push any system defaults
    const defaults = systemMappings.filter((m) => m.is_default);
    candidates.push(...defaults);
  }

  if (!candidates.length) {
    return { voiceProfileId: null, styleOverrides: {} };
  }

  // simple strategy: pick first candidate for now
  const chosen = candidates[0];
  return {
    voiceProfileId: chosen.voice_profile_id,
    styleOverrides: chosen.style_overrides ?? {},
  };
}


