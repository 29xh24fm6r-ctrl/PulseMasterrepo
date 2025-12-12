// Mythic Coach Engine v1 - Context Builder
// lib/mythic/coach/context.ts

import { supabaseAdminClient } from '../../supabase/admin';
import { MythicContext } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdminClient
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function buildMythicContext(params: {
  userId: string;
  dealId?: string;
}): Promise<MythicContext> {
  const dbUserId = await resolveUserId(params.userId);

  const [
    profileRes,
    chaptersRes,
    emotionRes,
    identityRes,
    destinyRes,
    dealsRes,
  ] = await Promise.all([
    supabaseAdminClient
      .from('user_mythic_profile')
      .select('*')
      .eq('user_id', dbUserId)
      .maybeSingle(),
    supabaseAdminClient
      .from('life_chapters')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('status', 'active')
      .order('timeframe_start', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdminClient
      .from('emotion_state_daily')
      .select('*')
      .eq('user_id', dbUserId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdminClient
      .from('identity_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdminClient
      .from('destiny_arcs')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdminClient
      .from('deals')
      .select('id')
      .eq('user_id', dbUserId)
      .in('status', ['active', 'negotiating', 'in_progress'])
      .limit(10),
  ]);

  const profile = profileRes.data;
  const currentChapter = chaptersRes.data;
  const emotion = emotionRes.data;
  const identity = identityRes.data;
  const destiny = destinyRes.data;
  const deals = dealsRes.data ?? [];

  // Get deal archetype runs for active deals
  const dealIds = params.dealId
    ? [params.dealId]
    : deals.map((d: any) => d.id).slice(0, 5);

  const { data: dealRuns } = await supabaseAdminClient
    .from('deal_archetype_runs')
    .select('*')
    .eq('user_id', dbUserId)
    .in('deal_id', dealIds.length > 0 ? dealIds : ['00000000-0000-0000-0000-000000000000'])
    .order('created_at', { ascending: false });

  const dealRunsMap = new Map(
    (dealRuns ?? []).map((run: any) => [run.deal_id, run])
  );

  const activeDeals = dealIds.map((dealId) => ({
    deal_id: dealId,
    archetype_run: dealRunsMap.get(dealId) ?? null,
  }));

  return {
    userId: params.userId,
    currentChapter: currentChapter ?? null,
    mythicProfile: profile ?? null,
    activeDeals,
    emotionSnapshot: emotion
      ? {
          stress_level: emotion.stress_level,
          valence: emotion.valence,
          state: emotion.state,
        }
      : null,
    identityTraits: identity ?? null,
    activeGoals: destiny ? [destiny] : [],
  };
}


