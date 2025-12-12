// Strategic Mind v1 - Equilibrium Solver
// lib/strategic_mind/v1/equilibrium_solver.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { StrategicSignalBundle, StrategicEquilibrium } from './types';
import { STRATEGIC_EQUILIBRIUM_PROMPT } from './prompts';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function solveStrategicEquilibrium(
  userId: string,
  bundle: StrategicSignalBundle,
  conflicts: any[]
): Promise<StrategicEquilibrium | null> {
  const dbUserId = await resolveUserId(userId);

  const result = await callAIJson<{ equilibrium: StrategicEquilibrium }>({
    userId,
    feature: 'strategic_mind_equilibrium',
    systemPrompt: STRATEGIC_EQUILIBRIUM_PROMPT,
    userPrompt: JSON.stringify({
      bundle,
      conflicts,
    }, null, 2),
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Strategic Mind] Failed to solve equilibrium', result.error);
    return null;
  }

  const { equilibrium } = result.data;

  if (!equilibrium) return null;

  const { data, error } = await supabaseAdmin
    .from('strategic_equilibria')
    .insert({
      user_id: dbUserId,
      timescale: equilibrium.timescale,
      equilibrium: equilibrium.equilibrium ?? {},
      rationale: equilibrium.rationale ?? {},
      predicted_outcomes: equilibrium.predictedOutcomes ?? {},
      confidence: equilibrium.confidence ?? 0.6,
    })
    .select('id');

  if (error) throw error;

  return equilibrium;
}


