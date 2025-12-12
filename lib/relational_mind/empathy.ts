// Empathic Resonance Layer
// lib/relational_mind/empathy.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { EmpathicResponseStyle } from './types';
import { EMPATHIC_STYLE_PROMPT } from './prompts';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

async function loadRelationalContext(userId: string, relationalIdentityId?: string | null) {
  const dbUserId = await resolveUserId(userId);

  if (!relationalIdentityId) return [null, null];

  const [{ data: idRows }, { data: stateRows }] = await Promise.all([
    supabaseAdmin
      .from('relational_identities')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('id', relationalIdentityId)
      .limit(1),
    supabaseAdmin
      .from('relational_state_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('relational_identity_id', relationalIdentityId)
      .order('snapshot_time', { ascending: false })
      .limit(1),
  ]);

  return [idRows?.[0] ?? null, stateRows?.[0] ?? null];
}

export async function generateEmpathicResponseStyle(params: {
  userId: string;
  source: string;
  context: {
    channel: 'voice' | 'text' | 'email' | 'in_person';
    relationalIdentityId?: string;
    userEmotion?: any;
    somaticState?: any;
    otherContext?: any; // message content, situation, etc.
  };
}): Promise<EmpathicResponseStyle> {
  const { userId, source, context } = params;
  const dbUserId = await resolveUserId(userId);

  const [identity, state] = await loadRelationalContext(userId, context.relationalIdentityId);

  const result = await callAIJson<{
    response: {
      detectedUserState: any;
      detectedOtherState: any;
      chosenStyle: {
        tone: string;
        pace: string;
        warmth: string;
        directness: string;
        coachProfileHint?: string;
      };
      suggestedMessage?: any;
    };
  }>({
    userId,
    feature: 'relational_mind_empathy',
    systemPrompt: EMPATHIC_STYLE_PROMPT,
    userPrompt: JSON.stringify({
      identity,
      state,
      channel: context.channel,
      userEmotion: context.userEmotion,
      somaticState: context.somaticState,
      otherContext: context.otherContext,
    }, null, 2),
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Relational Mind] Failed to generate empathic style', result.error);
    // Return default style
    return {
      chosenStyle: {
        tone: 'balanced',
        pace: 'normal',
        warmth: 'medium',
        directness: 'balanced',
      },
    };
  }

  const { response } = result.data;

  // Log event
  await supabaseAdmin
    .from('empathic_events')
    .insert({
      user_id: dbUserId,
      source,
      context,
      detected_user_state: response.detectedUserState ?? {},
      detected_other_state: response.detectedOtherState ?? {},
      chosen_style: response.chosenStyle ?? {},
      suggested_message: response.suggestedMessage ?? {},
    });

  return {
    detectedUserState: response.detectedUserState,
    detectedOtherState: response.detectedOtherState,
    chosenStyle: response.chosenStyle,
    suggestedMessage: response.suggestedMessage,
  };
}


