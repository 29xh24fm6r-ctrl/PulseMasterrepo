// Strategic Mind - Equilibrium Solver
// lib/strategic_mind/equilibrium_solver.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { aggregateSubsystemSignalsForUser } from './aggregate';
import { STRATEGIC_EQUILIBRIUM_PROMPT } from './prompts';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function solveStrategicEquilibrium(userId: string, now: Date) {
  const dbUserId = await resolveUserId(userId);

  // Get latest snapshot and conflicts
  const [{ data: latestSnapshot }, { data: recentConflicts }] = await Promise.all([
    supabaseAdmin
      .from('strategic_state_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false })
      .limit(1),
    supabaseAdmin
      .from('strategic_conflicts')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  if (!latestSnapshot?.[0]) {
    console.warn('[Strategic Mind] No snapshot found for equilibrium solving');
    return null;
  }

  // Aggregate current signals
  const signals = await aggregateSubsystemSignalsForUser(userId, now);

  const result = await callAIJson<{
    equilibrium: any;
    rationale: any;
    predictedOutcomes: any;
  }>({
    userId,
    feature: 'strategic_mind_equilibrium',
    systemPrompt: STRATEGIC_EQUILIBRIUM_PROMPT,
    userPrompt: JSON.stringify({
      snapshot: latestSnapshot[0],
      conflicts: recentConflicts ?? [],
      signals,
    }, null, 2),
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Strategic Mind] Failed to solve equilibrium', result.error);
    return null;
  }

  const { equilibrium, rationale, predictedOutcomes } = result.data;

  // Store equilibrium
  const { data, error } = await supabaseAdmin
    .from('strategic_equilibria')
    .insert({
      user_id: dbUserId,
      equilibrium: equilibrium ?? {},
      rationale: rationale ?? {},
      predicted_outcomes: predictedOutcomes ?? {},
    })
    .select('id');

  if (error) throw error;

  // Update latest snapshot with chosen equilibrium
  await supabaseAdmin
    .from('strategic_state_snapshots')
    .update({
      chosen_equilibrium: equilibrium ?? {},
    })
    .eq('id', latestSnapshot[0].id);

  return { equilibriumId: data?.[0]?.id as string, equilibrium, rationale, predictedOutcomes };
}


