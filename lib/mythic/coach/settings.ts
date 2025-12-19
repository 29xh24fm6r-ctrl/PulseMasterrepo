// Mythic Coach Engine v1 - Settings
// lib/mythic/coach/settings.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';
import { MythicCoachSettings } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function getMythicCoachSettings(userId: string): Promise<MythicCoachSettings> {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('user_mythic_coach_settings')
    .select('*')
    .eq('user_id', dbUserId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    // Create default settings
    const defaultSettings = {
      user_id: dbUserId,
      intensity: 'medium',
      tone: 'grounded',
      session_length: 'short',
      enabled: true,
      preferred_framework: 'heros_journey',
      last_daily_ritual_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: created, error: createError } = await supabaseAdmin
      .from('user_mythic_coach_settings')
      .insert(defaultSettings)
      .select('*')
      .single();

    if (createError) throw createError;
    return created;
  }

  return data;
}

export async function updateMythicCoachSettings(
  userId: string,
  patch: Partial<MythicCoachSettings>
): Promise<MythicCoachSettings> {
  const dbUserId = await resolveUserId(userId);

  const updateData = {
    ...patch,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('user_mythic_coach_settings')
    .update(updateData)
    .eq('user_id', dbUserId)
    .select('*')
    .single();

  if (error) {
    // If doesn't exist, create it
    if (error.code === 'PGRST116') {
      const defaultSettings = {
        user_id: dbUserId,
        intensity: 'medium',
        tone: 'grounded',
        session_length: 'short',
        enabled: true,
        preferred_framework: 'heros_journey',
        last_daily_ritual_at: null,
        ...updateData,
        created_at: new Date().toISOString(),
      };

      const { data: created, error: createError } = await supabaseAdmin
        .from('user_mythic_coach_settings')
        .insert(defaultSettings)
        .select('*')
        .single();

      if (createError) throw createError;
      return created;
    }
    throw error;
  }

  return data;
}


