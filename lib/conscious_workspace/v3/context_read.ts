// Conscious Workspace Context Helpers
// lib/conscious_workspace/v3/context_read.ts

import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function getLatestConsciousFrameForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('conscious_frames')
    .select('*')
    .eq('user_id', dbUserId)
    .order('frame_time', { ascending: false })
    .limit(1);

  if (error) {
    console.error('[Conscious Workspace] Failed to fetch latest frame', error);
    return null;
  }

  return data?.[0] ?? null;
}

export async function getConsciousItemsForFrame(userId: string, frameId: string) {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('conscious_items')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('frame_id', frameId)
    .order('attention_score', { ascending: false });

  if (error) {
    console.error('[Conscious Workspace] Failed to fetch items', error);
    return [];
  }

  return data ?? [];
}

export async function getConsciousConflictsForFrame(userId: string, frameId: string) {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('conscious_conflicts')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('frame_id', frameId)
    .order('severity', { ascending: false });

  if (error) {
    console.error('[Conscious Workspace] Failed to fetch conflicts', error);
    return [];
  }

  return data ?? [];
}

export async function getRecentInnerMonologueForUser(userId: string, limit: number = 20) {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('inner_monologue_turns')
    .select('*')
    .eq('user_id', dbUserId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Conscious Workspace] Failed to fetch monologue', error);
    return [];
  }

  return data ?? [];
}


