// Emotional Resonance - Response Style Selector
// lib/emotion/resonance.ts

import { supabaseAdmin } from '@/lib/supabase';
import { getEmotionSnapshotForUser } from './engine';
import { getSomaticSnapshotForUser } from '@/lib/somatic/engine';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export interface ResponseStyleContext {
  channel: 'chat' | 'voice' | 'notification';
  coach?: string;
  topic?: string;
}

export async function selectResponseStyleForContext(params: {
  userId: string;
  date?: Date;
  context: ResponseStyleContext;
}): Promise<string> {
  const date = params.date ?? new Date();
  const dbUserId = await resolveUserId(params.userId);

  // Get emotion and somatic state
  const [emotion, somatic] = await Promise.all([
    getEmotionSnapshotForUser(params.userId, date),
    getSomaticSnapshotForUser(params.userId, date),
  ]);

  // Simple rules v1:
  // - high stress -> 'calm_support'
  // - low energy (somatic loop) -> 'steady_partner'
  // - high positive excitement -> 'hype_coach'
  // - very low energy + high stress -> 'calm_support' (recovery mode)

  const stress = emotion?.stress_score ?? 0;
  const valence = emotion?.avg_valence ?? 0;
  const energy = somatic?.energy_score ?? 0.6;
  const fatigueRisk = somatic?.fatigue_risk ?? 0.3;

  let key = 'steady_partner'; // default

  // High stress or low energy -> calm support
  if (stress > 0.7 || (energy < 0.4 && fatigueRisk > 0.6)) {
    key = 'calm_support';
  }
  // High positive valence + good energy -> hype coach
  else if (valence > 0.4 && energy > 0.7) {
    key = 'hype_coach';
  }
  // Low energy -> steady partner (already default, but explicit)
  else if (energy < 0.5) {
    key = 'steady_partner';
  }

  return key;
}

export async function getResponseStyleProfile(styleKey: string) {
  const { data, error } = await supabaseAdmin
    .from('response_style_profiles')
    .select('*')
    .eq('key', styleKey)
    .maybeSingle();

  if (error) {
    console.error('[Emotion] Failed to get response style', error);
    return null;
  }

  return data;
}


