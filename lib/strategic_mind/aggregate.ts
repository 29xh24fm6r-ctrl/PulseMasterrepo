// Strategic Mind - Signal Aggregator
// lib/strategic_mind/aggregate.ts

import { supabaseAdmin } from '@/lib/supabase';
import { getOrCreateBrainPreferences } from '../meet_pulse/preferences';
import { getLatestBrainStatusForUser } from '../brain/registry/context_read';
import { buildAggregatedBrainContext } from '../agi_kernel/v2/context_aggregate';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function aggregateSubsystemSignalsForUser(userId: string, now: Date) {
  const dbUserId = await resolveUserId(userId);
  const day = now.toISOString().slice(0, 10);

  // Aggregate signals from all subsystems
  const [
    brainContext,
    brainStatus,
    prefs,
    emotionState,
    somaticState,
    narrativeSnapshot,
    destinyArc,
    timelineDecision,
    relationshipHighlights,
    culturalProfiles,
    wisdomPlaybooks,
    behaviorPredictions,
    cognitiveInsights,
  ] = await Promise.all([
    buildAggregatedBrainContext(userId, now),
    getLatestBrainStatusForUser(userId),
    getOrCreateBrainPreferences(userId),
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
      .from('relationship_highlights')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('cultural_profiles')
      .select('*')
      .eq('user_id', dbUserId),
    supabaseAdmin
      .from('wisdom_playbooks')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('status', 'active')
      .limit(10),
    supabaseAdmin
      .from('behavior_predictions')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('cognitive_insights')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  // Get goal hierarchy
  const { data: goals } = await supabaseAdmin
    .from('goal_hierarchy')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('status', 'active')
    .order('timescale', { ascending: true })
    .order('importance', { ascending: false });

  return {
    brainContext,
    brainStatus,
    prefs,
    emotionState: emotionState?.data ?? null,
    somaticState: somaticState?.data ?? null,
    narrativeSnapshot: narrativeSnapshot?.data?.[0] ?? null,
    destinyArc: destinyArc?.data?.[0] ?? null,
    timelineDecision: timelineDecision?.data?.[0] ?? null,
    relationshipHighlights: relationshipHighlights?.data ?? [],
    culturalProfiles: culturalProfiles?.data ?? [],
    wisdomPlaybooks: wisdomPlaybooks?.data ?? [],
    behaviorPredictions: behaviorPredictions?.data ?? [],
    cognitiveInsights: cognitiveInsights?.data ?? [],
    goals: goals ?? [],
  };
}


