// What-If Replay Mode v1 - Context Builder
// lib/what_if_replay/v1/context.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';
import { WhatIfSimulationContext, WhatIfMode } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function buildWhatIfSimulationContext(
  userId: string,
  now: Date,
  params: {
    scenario: {
      label: string;
      baseAssumption: string;
      alternateAssumption: string;
      horizon: string;
      mode: WhatIfMode;
      anchorTime?: string | null;
    };
  }
): Promise<WhatIfSimulationContext> {
  // userId should be a database ID (resolved in simulate.ts)
  const dbUserId = userId;
  const day = now.toISOString().slice(0, 10);

  const [
    destiny,
    timelines,
    narrative,
    identity,
    finances,
    health,
    relationships,
    culture,
  ] = await Promise.all([
    supabaseAdmin
      .from('destiny_arcs')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1),
    supabaseAdmin
      .from('timeline_decisions')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(10),
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
      .from('financial_state_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('somatic_state_daily')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('date', day)
      .maybeSingle(),
    supabaseAdmin
      .from('relational_state_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('cultural_profiles')
      .select('*')
      .eq('user_id', dbUserId),
  ]);

  return {
    now: now.toISOString(),
    userId,
    scenario: params.scenario,
    destinySnapshot: destiny.data?.[0] ?? null,
    timelineSnapshots: timelines.data ?? [],
    narrativeSnapshot: narrative.data?.[0] ?? null,
    identitySnapshot: identity.data?.[0] ?? null,
    financialState: finances.data ?? null,
    healthState: health.data ?? null,
    relationshipState: relationships.data ?? [],
    ethnographicProfiles: culture.data ?? [],
  };
}

