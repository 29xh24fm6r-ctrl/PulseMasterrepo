// Strategic Mind - Strategic Snapshot Builder
// lib/strategic_mind/strategic_snapshot.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { aggregateSubsystemSignalsForUser } from './aggregate';
import { STRATEGIC_AGGREGATE_PROMPT } from './prompts';
import { StrategicStateSnapshot } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function buildStrategicStateSnapshot(userId: string, now: Date) {
  const dbUserId = await resolveUserId(userId);

  // Aggregate all subsystem signals
  const signals = await aggregateSubsystemSignalsForUser(userId, now);

  const result = await callAIJson<{
    snapshot: StrategicStateSnapshot;
  }>({
    userId,
    feature: 'strategic_mind_snapshot',
    systemPrompt: STRATEGIC_AGGREGATE_PROMPT,
    userPrompt: JSON.stringify(signals, null, 2),
    maxTokens: 4000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Strategic Mind] Failed to build snapshot', result.error);
    return null;
  }

  const { snapshot } = result.data;

  // Store snapshot
  const { data, error } = await supabaseAdmin
    .from('strategic_state_snapshots')
    .insert({
      user_id: dbUserId,
      snapshot_time: now.toISOString(),
      active_goals: snapshot.activeGoals ?? [],
      dominant_needs: snapshot.dominantNeeds ?? [],
      predicted_risks: snapshot.predictedRisks ?? [],
      opportunities: snapshot.opportunities ?? [],
      subsystem_signals: snapshot.subsystemSignals ?? {},
      conflicts: snapshot.conflicts ?? [],
      chosen_equilibrium: snapshot.chosenEquilibrium ?? null,
      confidence: snapshot.confidence ?? 0.7,
    })
    .select('id');

  if (error) throw error;
  return { snapshotId: data?.[0]?.id as string, snapshot };
}


