// Strategic Mind v1 - Strategic Snapshot Builder
// lib/strategic_mind/v1/snapshot.ts

import { supabaseAdmin } from '@/lib/supabase';
import { StrategicSignalBundle } from './types';
import { detectStrategicConflicts } from './conflict_detection';
import { solveStrategicEquilibrium } from './equilibrium_solver';
import { generateStrategyRecommendations } from './recommendations';
import { buildStrategicSignalBundle } from './aggregate_signals';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function runStrategicMindSnapshot(
  userId: string,
  now: Date
) {
  const dbUserId = await resolveUserId(userId);

  const bundle = await buildStrategicSignalBundle(userId, now);
  const conflicts = await detectStrategicConflicts(userId, bundle);
  const equilibrium = await solveStrategicEquilibrium(userId, bundle, conflicts);
  const recommendations = equilibrium
    ? await generateStrategyRecommendations(userId, bundle, equilibrium, conflicts)
    : [];

  const { error } = await supabaseAdmin
    .from('strategic_state_snapshots')
    .insert({
      user_id: dbUserId,
      snapshot_time: now.toISOString(),
      active_goals: bundle.goals ?? [],
      dominant_needs: inferDominantNeeds(bundle),
      predicted_risks: bundle.forecast ?? [],
      opportunities: extractOpportunities(bundle),
      subsystem_signals: {
        emotion: bundle.emotion,
        somatic: bundle.somatic,
        relationships: bundle.relationships,
        culture: bundle.culture,
        brainHealth: bundle.brainHealth,
      },
      conflicts: conflicts ?? [],
      chosen_equilibrium: equilibrium ?? {},
      confidence: equilibrium?.confidence ?? 0.6,
    });

  if (error) throw error;

  return { bundle, conflicts, equilibrium, recommendations };
}

function inferDominantNeeds(bundle: StrategicSignalBundle) {
  // Simple heuristic stub: Claude can refine
  return {
    rest: bundle.somatic?.fatigue_level ?? null,
    emotionalRelief: bundle.emotion?.stress_level ?? null,
    relationshipRepair: bundle.relationships?.length,
    strategicFocus: true,
  };
}

function extractOpportunities(bundle: StrategicSignalBundle) {
  // Use forecast insights and relationships as a simple first pass
  return bundle.forecast ?? [];
}


