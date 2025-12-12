// Ethnographic Intelligence - Context Reader
// lib/ethnography/context.ts

import { supabaseAdmin } from '@/lib/supabase';
import { CulturalDomain } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function getCulturalProfileForDomain(
  userId: string,
  domain: CulturalDomain
) {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('cultural_profiles')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('domain', domain)
    .limit(1);

  if (error) throw error;
  return data?.[0] ?? null;
}

export async function getAllCulturalProfilesForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('cultural_profiles')
    .select('*')
    .eq('user_id', dbUserId);

  if (error) throw error;
  return data ?? [];
}

export async function getCulturalHighlightsForUser(userId: string, limit: number = 20) {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('cultural_highlights')
    .select('*')
    .eq('user_id', dbUserId)
    .order('importance', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}


