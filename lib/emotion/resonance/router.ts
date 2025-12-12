// Emotion Style Router
// lib/emotion/resonance/router.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { EmotionInteractionContext, ResponseStyle } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const EMOTION_STYLE_ROUTER_PROMPT = `
You are the Emotional Mirroring Router.

You see:
- Current emotional + somatic state of the user.
- The channel (voice, chat, notification, etc.) and context.
- EmotionStyleProfile (how they generally like to be spoken to).
- Channel-specific preferences.

Your job:
- Choose a ResponseStyle that:
  - Respects their boundaries.
  - Matches the intensity of the moment (never over-hype a meltdown, never underplay a crisis).
  - Aligns tone and stance with:
    - "companion" when they need support.
    - "coach" when they need push.
    - "strategist" when they need plans.
    - "therapist_like" when they need deep reflection (without pretending to be an actual therapist).
- Decide:
  - tone
  - stance
  - length (short/medium/long)
  - personaKey (which coach persona to route through, if any)
  - channelHints (e.g., "keep notifications very short")

Return JSON: { "style": { ... } }.

Only return valid JSON.`;

export async function chooseResponseStyleForInteraction(ctx: EmotionInteractionContext): Promise<ResponseStyle> {
  const { userId, channel, context, inputEmotionState, inputSomaticState, narrativeContext, socialContext } = ctx;
  const dbUserId = await resolveUserId(userId);

  const [{ data: styleRows }, { data: channelRows }] = await Promise.all([
    supabaseAdmin
      .from('emotion_style_profile')
      .select('*')
      .eq('user_id', dbUserId)
      .limit(1),
    supabaseAdmin
      .from('emotion_channel_settings')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('channel', channel)
      .limit(1),
  ]);

  const styleProfile = styleRows?.[0] ?? null;
  const channelSettings = channelRows?.[0] ?? null;

  const result = await callAIJson<{ style: ResponseStyle }>({
    userId,
    feature: 'emotion_style_router',
    systemPrompt: EMOTION_STYLE_ROUTER_PROMPT,
    userPrompt: JSON.stringify({
      channel,
      context,
      inputEmotionState,
      inputSomaticState,
      narrativeContext,
      socialContext,
      styleProfile: styleProfile ? {
        baselineStyle: styleProfile.baseline_style,
        crisisStyle: styleProfile.crisis_style,
        hypeStyle: styleProfile.hype_style,
        reflectiveStyle: styleProfile.reflective_style,
        emotionToStyleMap: styleProfile.emotion_to_style_map,
        personaPreferences: styleProfile.persona_preferences,
        boundaries: styleProfile.boundaries,
        summary: styleProfile.summary,
      } : null,
      channelSettings: channelSettings ? {
        tonePreferences: channelSettings.tone_preferences,
        lengthPreferences: channelSettings.length_preferences,
        interruptionRules: channelSettings.interruption_rules,
        sensitivityRules: channelSettings.sensitivity_rules,
      } : null,
    }, null, 2),
    maxTokens: 1500,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Emotion Resonance] Failed to choose response style', result.error);
    // Return a safe default
    return {
      tone: 'calm',
      stance: 'companion',
      length: 'medium',
    };
  }

  return result.data.style;
}


