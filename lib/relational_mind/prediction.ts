// Relational Prediction Engine (Theory of Mind)
// lib/relational_mind/prediction.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { RelationalPredictionInput } from './types';
import { RELATIONAL_PREDICTION_PROMPT } from './prompts';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function predictRelationalOutcome(
  userId: string,
  input: RelationalPredictionInput
) {
  const dbUserId = await resolveUserId(userId);

  const [{ data: identityRows }, { data: stateRows }] = await Promise.all([
    supabaseAdmin
      .from('relational_identities')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('id', input.relationalIdentityId)
      .limit(1),
    supabaseAdmin
      .from('relational_state_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('relational_identity_id', input.relationalIdentityId)
      .order('snapshot_time', { ascending: false })
      .limit(1),
  ]);

  const identity = identityRows?.[0];
  const state = stateRows?.[0];

  if (!identity) return null;

  const result = await callAIJson<{
    prediction: {
      predictedReaction: any;
      predictedEffect: any;
      confidence: number;
      recommendation: any;
    };
  }>({
    userId,
    feature: 'relational_mind_prediction',
    systemPrompt: RELATIONAL_PREDICTION_PROMPT,
    userPrompt: JSON.stringify({
      identity,
      state,
      context: input.context,
      horizon: input.horizon,
    }, null, 2),
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Relational Mind] Failed to generate prediction', result.error);
    return null;
  }

  const { prediction } = result.data;

  const { data, error } = await supabaseAdmin
    .from('relational_predictions')
    .insert({
      user_id: dbUserId,
      relational_identity_id: input.relationalIdentityId,
      context: input.context,
      horizon: input.horizon,
      predicted_reaction: prediction.predictedReaction ?? {},
      predicted_effect_on_relationship: prediction.predictedEffect ?? {},
      confidence: prediction.confidence ?? 0.5,
      recommendation: prediction.recommendation ?? {},
    })
    .select('id');

  if (error) throw error;
  return data?.[0]?.id as string;
}


