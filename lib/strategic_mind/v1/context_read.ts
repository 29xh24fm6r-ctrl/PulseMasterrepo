// Strategic Mind v1 - Context Reader
// lib/strategic_mind/v1/context_read.ts

import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function getLatestStrategicContextForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const [snapshot, recommendations] = await Promise.all([
    supabaseAdmin
      .from('strategic_state_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false })
      .limit(1),
    supabaseAdmin
      .from('strategy_recommendations')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return {
    snapshot: snapshot.data?.[0] ?? null,
    recommendations: recommendations.data ?? [],
  };
}


