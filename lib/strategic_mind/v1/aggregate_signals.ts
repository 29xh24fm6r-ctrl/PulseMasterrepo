// Strategic Mind v1 - Signal Aggregator
// lib/strategic_mind/v1/aggregate_signals.ts

import { supabaseAdmin } from '@/lib/supabase';
import { StrategicSignalBundle } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function buildStrategicSignalBundle(
  userId: string,
  now: Date
): Promise<StrategicSignalBundle> {
  const dbUserId = await resolveUserId(userId);
  const day = now.toISOString().slice(0, 10);

  const [
    goals,
    destinyArc,
    timelineDecision,
    narrativeSnapshot,
    selfMirrorSnapshot,
    emotionState,
    somaticState,
    relationalSnapshots,
    culturalProfiles,
    brainHealthSnapshot,
    archetypeSnapshot,
    cognitiveInsights,
    prefs,
    hypotheses,
    forecastInsights,
  ] = await Promise.all([
    supabaseAdmin
      .from('goal_hierarchy')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('status', 'active'),
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
      .limit(30),
    supabaseAdmin
      .from('cultural_profiles')
      .select('*')
      .eq('user_id', dbUserId),
    supabaseAdmin
      .from('brain_health_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('archetype_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('cognitive_insights')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabaseAdmin
      .from('pulse_brain_preferences')
      .select('*')
      .eq('user_id', dbUserId)
      .limit(1),
    supabaseAdmin
      .from('cognitive_hypotheses')
      .select('*')
      .eq('user_id', dbUserId),
    supabaseAdmin
      .from('cognitive_insights')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('source_phase', 'forecasting')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return {
    now: now.toISOString(),
    goals: goals.data ?? [],
    destiny: destinyArc.data?.[0] ?? null,
    timeline: timelineDecision.data?.[0] ?? null,
    narrative: narrativeSnapshot.data?.[0] ?? null,
    identity: selfMirrorSnapshot.data?.[0] ?? null,
    emotion: emotionState.data ?? null,
    somatic: somaticState.data ?? null,
    relationships: relationalSnapshots.data ?? [],
    culture: culturalProfiles.data ?? [],
    brainHealth: brainHealthSnapshot.data ?? null,
    archetypeSnapshot: archetypeSnapshot.data ?? null,
    forecast: forecastInsights.data ?? [],
    presencePrefs: prefs.data?.[0] ?? null,
    hypotheses: hypotheses.data ?? [],
    insights: cognitiveInsights.data ?? [],
  };
}

