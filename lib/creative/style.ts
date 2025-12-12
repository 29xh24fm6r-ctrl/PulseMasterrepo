// Creative Cortex v2 - Style Profiles
// lib/creative/style.ts

import { supabaseAdminClient } from '../../supabase/admin';
import { CreativeStyleProfile } from './types';

export async function getCreativeStyleProfiles(userId: string): Promise<CreativeStyleProfile[]> {
  const { data, error } = await supabaseAdminClient
    .from('creative_style_profiles')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getDefaultStyleProfile(userId: string): Promise<CreativeStyleProfile | null> {
  const { data, error } = await supabaseAdminClient
    .from('creative_style_profiles')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertCreativeStyleProfile(
  userId: string,
  profile: Partial<CreativeStyleProfile> & { name: string }
): Promise<CreativeStyleProfile> {
  // If setting as default, unset other defaults
  if (profile.is_default) {
    await supabaseAdminClient
      .from('creative_style_profiles')
      .update({ is_default: false })
      .eq('user_id', userId)
      .eq('is_default', true);
  }

  const { data, error } = await supabaseAdminClient
    .from('creative_style_profiles')
    .upsert(
      {
        user_id: userId,
        name: profile.name,
        description: profile.description ?? null,
        tone: profile.tone ?? null,
        constraints: profile.constraints ?? null,
        examples: profile.examples ?? null,
        is_default: profile.is_default ?? false,
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single();

  if (error) throw error;
  return data;
}


