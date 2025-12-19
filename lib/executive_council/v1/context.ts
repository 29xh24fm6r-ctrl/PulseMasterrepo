// Executive Council Mode v1 - Context Builder
// lib/executive_council/v1/context.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';
import { CouncilDecisionContext } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function buildCouncilDecisionContext(
  userId: string,
  now: Date,
  params: {
    topic: string;
    question: string;
    timescale?: string;
    importance?: number;
    rawContext?: any;
  }
): Promise<CouncilDecisionContext> {
  const dbUserId = await resolveUserId(userId);
  const day = now.toISOString().slice(0, 10);

  const [
    strategicSnapshot,
    equilibrium,
    narrative,
    identity,
    emotion,
    somatic,
    relationships,
    culture,
    financialState,
    destinySnapshot,
  ] = await Promise.all([
    supabaseAdmin
      .from('strategic_state_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false })
      .limit(1),
    supabaseAdmin
      .from('strategic_equilibria')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(1),
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
      .from('relational_state_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('cultural_profiles')
      .select('*')
      .eq('user_id', dbUserId),
    supabaseAdmin
      .from("financial_state_snapshots") // assuming or create later
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('destiny_arcs')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  return {
    now: now.toISOString(),
    userId,
    topic: params.topic,
    question: params.question,
    timescale: params.timescale ?? null,
    importance: params.importance ?? 0.6,
    rawContext: params.rawContext ?? {},

    strategicSnapshot: strategicSnapshot.data?.[0] ?? null,
    strategicEquilibrium: equilibrium.data?.[0] ?? null,
    narrative: narrative.data?.[0] ?? null,
    identity: identity.data?.[0] ?? null,
    emotion: emotion.data ?? null,
    somatic: somatic.data ?? null,
    relationships: relationships.data ?? [],
    culture: culture.data ?? [],
    financialState: financialState.data ?? null,
    destinySnapshot: destinySnapshot.data?.[0] ?? null,
  };
}


