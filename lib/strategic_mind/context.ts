// Strategic Mind - Context Reader
// lib/strategic_mind/context.ts

import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function getLatestStrategicSnapshot(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('strategic_state_snapshots')
    .select('*')
    .eq('user_id', dbUserId)
    .order('snapshot_time', { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] ?? null;
}

export async function getActiveConflicts(userId: string, limit: number = 10) {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('strategic_conflicts')
    .select('*')
    .eq('user_id', dbUserId)
    .order('severity', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getLatestEquilibrium(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('strategic_equilibria')
    .select('*')
    .eq('user_id', dbUserId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] ?? null;
}

export async function getStrategyRecommendations(userId: string, limit: number = 20) {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('strategy_recommendations')
    .select('*')
    .eq('user_id', dbUserId)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}


