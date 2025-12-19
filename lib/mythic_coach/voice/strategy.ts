// Mythic Coach Voice Persona v1 - Voice Strategy
// lib/mythic_coach/voice/strategy.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';
import { selectMythicVoiceProfile, MythicVoiceContext } from './selector';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function getMythicCoachVoiceForSession(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const [archetypesRes, emotionRes] = await Promise.all([
    supabaseAdmin
      .from('archetype_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('emotion_state_daily')
      .select('*')
      .eq('user_id', dbUserId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const archetypes = archetypesRes.data;
  const emotion = emotionRes.data;

  // Extract dominant archetype from snapshot
  const currentMix = archetypes?.current_mix ?? [];
  const dominant = currentMix.length > 0 ? currentMix[0] : null;
  const mode = dominant?.mode ?? null;

  let emotionalLoad: 'stressed' | 'calm' | 'overwhelmed' | 'hyped' | null = null;
  if (emotion?.stress_level && emotion.stress_level > 0.7) {
    emotionalLoad = 'overwhelmed';
  } else if (emotion?.stress_level && emotion.stress_level > 0.5) {
    emotionalLoad = 'stressed';
  } else if (emotion?.valence && emotion.valence > 0.6) {
    emotionalLoad = 'hyped';
  } else {
    emotionalLoad = 'calm';
  }

  const intensityHint =
    emotionalLoad === 'overwhelmed' || emotionalLoad === 'stressed'
      ? 'soft'
      : emotionalLoad === 'hyped'
      ? 'balanced'
      : 'balanced';

  return selectMythicVoiceProfile({
    userId,
    archetypeId: dominant?.id ?? null,
    mode: mode ?? null,
    emotionalLoad,
    intensityHint,
  });
}

