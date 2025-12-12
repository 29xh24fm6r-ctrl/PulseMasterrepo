// AGI Kernel v2 Context Aggregator
// lib/agi_kernel/v2/context_aggregate.ts

import { supabaseAdmin } from '@/lib/supabase';
import { AggregatedBrainContext } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function buildAggregatedBrainContext(
  userId: string,
  now: Date
): Promise<AggregatedBrainContext> {
  const dbUserId = await resolveUserId(userId);
  const day = now.toISOString().slice(0, 10);

  const [
    emotionSummary,
    somaticSummary,
    narrativeSummary,
    identitySummary,
    destinySummary,
    timelineSummary,
    relationshipSummary,
    brainHealthSnapshot,
  ] = await Promise.all([
    supabaseAdmin
      .from('emotion_state_daily')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('date', day)
      .maybeSingle(),
    supabaseAdmin
      .from('somatic_state_daily')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('date', day)
      .maybeSingle(),
    supabaseAdmin
      .from('narrative_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(1),
    supabaseAdmin
      .from('self_mirror_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(1),
    supabaseAdmin
      .from('destiny_arcs')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('is_active', true)
      .limit(1),
    supabaseAdmin
      .from('timeline_decisions')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(1),
    supabaseAdmin
      .from('relational_state_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('brain_health_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false })
      .limit(1),
  ]);

  return {
    memorySummary: null, // TODO: implement memory daily summaries
    emotionSummary: emotionSummary?.data ?? null,
    somaticSummary: somaticSummary?.data ?? null,
    narrativeSummary: narrativeSummary?.data?.[0] ?? null,
    identitySummary: identitySummary?.data?.[0] ?? null,
    destinySummary: destinySummary?.data?.[0] ?? null,
    timelineSummary: timelineSummary?.data?.[0] ?? null,
    relationshipSummary: relationshipSummary?.data ?? [],
    brainHealthSummary: brainHealthSnapshot?.data?.[0] ?? null,
  };
}


