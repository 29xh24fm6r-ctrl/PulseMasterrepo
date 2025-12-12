// Emotion Interaction Logger
// lib/emotion/resonance/logger.ts

import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function logEmotionInteraction(
  userId: string,
  payload: {
    channel: string;
    context?: string;
    inputEmotionState: any;
    inputSomaticState: any;
    responseStyle: any;
    interventionKind: string;
    outcomeEmotionState?: any;
    userFeedback?: any;
    resonanceScore?: number;
  }
) {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('emotion_interaction_log')
    .insert({
      user_id: dbUserId,
      channel: payload.channel,
      context: payload.context ?? null,
      input_emotion_state: payload.inputEmotionState ?? {},
      input_somatic_state: payload.inputSomaticState ?? {},
      response_style: payload.responseStyle ?? {},
      intervention_kind: payload.interventionKind,
      outcome_emotion_state: payload.outcomeEmotionState ?? {},
      user_feedback: payload.userFeedback ?? {},
      resonance_score: payload.resonanceScore ?? null,
    })
    .select('id');

  if (error) {
    console.error('[Emotion Resonance] Failed to log interaction', error);
    throw error;
  }
  return data?.[0]?.id as string;
}


