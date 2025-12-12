// Brain Preferences Helper
// lib/meet_pulse/preferences.ts

import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function getOrCreateBrainPreferences(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const { data } = await supabaseAdmin
    .from('pulse_brain_preferences')
    .select('*')
    .eq('user_id', dbUserId)
    .limit(1);

  if (data?.[0]) return data[0];

  const { data: created, error } = await supabaseAdmin
    .from('pulse_brain_preferences')
    .insert({
      user_id: dbUserId,
    })
    .select('*');

  if (error) throw error;
  return created?.[0];
}

export async function updateBrainPreferences(
  userId: string,
  patch: Partial<{
    presence_level: number;
    proactivity_level: number;
    emotional_intensity: number;
    depth_of_reflection: number;
    privacy_sensitivity: number;
    allow_autonomous_tweaks: boolean;
    allow_relationship_feedback: boolean;
    allow_financial_nudges: boolean;
    allow_health_nudges: boolean;
    preferred_voice_profile: string | null;
    preferred_persona_style: string | null;
    ui_mode: string;
    notes: any;
  }>
) {
  const dbUserId = await resolveUserId(userId);

  const existing = await getOrCreateBrainPreferences(userId);

  const { data, error } = await supabaseAdmin
    .from('pulse_brain_preferences')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id)
    .select('*');

  if (error) throw error;
  return data?.[0];
}


