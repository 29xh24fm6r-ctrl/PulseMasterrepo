// Civilization Settings
// lib/civilization/settings.ts

import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export interface CivilizationSettings {
  user_id: string;
  scoreboards_enabled: boolean;
  allow_anonymous_global: boolean;
  allow_handle_global: boolean;
  public_handle?: string;
  vertical_prefs: Record<string, any>;
  contribute_anonymous_patterns?: boolean;
}

export async function getCivilizationSettings(
  userId: string,
): Promise<CivilizationSettings | null> {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('civilization_settings')
    .select('*')
    .eq('user_id', dbUserId)
    .maybeSingle();

  if (error) {
    console.error('[Civilization] Failed to load settings', error);
    return null;
  }

  if (!data) {
    // Create default settings
    const defaultSettings: CivilizationSettings = {
      user_id: dbUserId,
      scoreboards_enabled: false,
      allow_anonymous_global: false,
      allow_handle_global: false,
      vertical_prefs: {},
      contribute_anonymous_patterns: false,
    };

    const { data: created } = await supabaseAdmin
      .from('civilization_settings')
      .insert(defaultSettings)
      .select('*')
      .single();

    return created as CivilizationSettings;
  }

  return data as CivilizationSettings;
}

export async function upsertCivilizationSettings(
  userId: string,
  patch: Partial<CivilizationSettings>,
): Promise<void> {
  const dbUserId = await resolveUserId(userId);

  const { error } = await supabaseAdmin
    .from('civilization_settings')
    .upsert(
      {
        user_id: dbUserId,
        ...patch,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

  if (error) {
    console.error('[Civilization] Failed to update settings', error);
    throw new Error('Failed to update civilization settings');
  }
}

export async function canContributePatterns(userId: string): Promise<boolean> {
  const settings = await getCivilizationSettings(userId);
  return settings?.contribute_anonymous_patterns === true;
}


