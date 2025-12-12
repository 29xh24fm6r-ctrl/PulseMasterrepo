// Ethnographic Intelligence - Cultural Prediction Engine
// lib/ethnography/predict.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { CulturalDomain, CulturalPredictionInput } from './types';
import { CULTURAL_PREDICTION_PROMPT } from './prompts';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function predictCulturalResponse(
  userId: string,
  input: CulturalPredictionInput
): Promise<string | null> {
  const dbUserId = await resolveUserId(userId);

  // Get current cultural profile for domain
  const { data: profile } = await supabaseAdmin
    .from('cultural_profiles')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('domain', input.domain)
    .limit(1);

  if (!profile?.[0]) {
    console.warn(`[Ethnography] No profile found for domain ${input.domain}`);
    return null;
  }

  const result = await callAIJson<{
    predictedResponse: any;
    recommendedStrategy: any;
    confidence: number;
  }>({
    userId,
    feature: 'ethnography_prediction',
    systemPrompt: CULTURAL_PREDICTION_PROMPT,
    userPrompt: JSON.stringify({
      domain: input.domain,
      culturalProfile: profile[0],
      context: input.context,
    }, null, 2),
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Ethnography] Failed to generate prediction', result.error);
    return null;
  }

  const { predictedResponse, recommendedStrategy, confidence } = result.data;

  const { data, error } = await supabaseAdmin
    .from('cultural_predictions')
    .insert({
      user_id: dbUserId,
      domain: input.domain,
      context: input.context,
      predicted_response: predictedResponse ?? {},
      recommended_strategy: recommendedStrategy ?? {},
      confidence: confidence ?? 0.7,
    })
    .select('id');

  if (error) throw error;
  return data?.[0]?.id as string;
}


