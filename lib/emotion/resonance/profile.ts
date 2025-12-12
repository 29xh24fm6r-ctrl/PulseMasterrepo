// Emotion Style Profile Builder
// lib/emotion/resonance/profile.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { EmotionStyleProfile } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const EMOTION_STYLE_PROFILE_PROMPT = `
You are the Emotional Style Profiler.

You see:
- The user's values and identity from the valueProfile.
- Past emotion_interaction_log entries (how Pulse responded + outcomes).
- Highlighted emotion_resonance_events (what really helped or hurt).

Your job:
1. Infer a baselineStyle (general way they like to be spoken to).
2. Infer crisisStyle, hypeStyle, reflectiveStyle.
3. Build emotionToStyleMap: for major emotional clusters (overwhelm, shame, anger, anxiety, boredom, determination, etc.), define preferred tone, stance, and length.
4. Map personaPreferences: which personas (coach archetypes) fit which contexts.
5. Define boundaries: styles/topics to avoid in certain emotional states.
6. Write a short summary describing "how to talk to this person when they're in different states."

Return JSON: { "profile": { ... } }.

Only return valid JSON.`;

async function getValueProfileForUser(userId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);

  const { data } = await supabaseAdmin
    .from('value_profile')
    .select('*')
    .eq('user_id', dbUserId)
    .limit(1);

  return data?.[0] ?? null;
}

export async function refreshEmotionStyleProfileForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const [valueProfile, pastInteractionsRes, resonanceEventsRes] = await Promise.all([
    getValueProfileForUser(userId).catch(() => null),
    supabaseAdmin
      .from('emotion_interaction_log')
      .select('*')
      .eq('user_id', dbUserId)
      .order('occurred_at', { ascending: false })
      .limit(500),
    supabaseAdmin
      .from('emotion_resonance_events')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  const result = await callAIJson<{ profile: EmotionStyleProfile }>({
    userId,
    feature: 'emotion_style_profile',
    systemPrompt: EMOTION_STYLE_PROFILE_PROMPT,
    userPrompt: JSON.stringify({
      valueProfile: valueProfile ? {
        summary: valueProfile.summary,
        coreValues: valueProfile.core_values || [],
        rolePriorities: valueProfile.role_priorities || {},
      } : null,
      pastInteractions: (pastInteractionsRes.data || []).slice(0, 100).map((i: any) => ({
        channel: i.channel,
        context: i.context,
        inputEmotionState: i.input_emotion_state || {},
        responseStyle: i.response_style || {},
        interventionKind: i.intervention_kind,
        outcomeEmotionState: i.outcome_emotion_state || {},
        userFeedback: i.user_feedback || {},
        resonanceScore: i.resonance_score,
      })),
      resonanceEvents: (resonanceEventsRes.data || []).slice(0, 50).map((e: any) => ({
        direction: e.direction,
        magnitude: e.magnitude,
        summary: e.summary,
        patternTags: e.pattern_tags || {},
      })),
    }, null, 2),
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Emotion Resonance] Failed to generate style profile', result.error);
    return;
  }

  const { profile } = result.data;

  const { error } = await supabaseAdmin
    .from('emotion_style_profile')
    .upsert(
      {
        user_id: dbUserId,
        baseline_style: profile.baselineStyle ?? {},
        crisis_style: profile.crisisStyle ?? {},
        hype_style: profile.hypeStyle ?? {},
        reflective_style: profile.reflectiveStyle ?? {},
        emotion_to_style_map: profile.emotionToStyleMap ?? {},
        persona_preferences: profile.personaPreferences ?? {},
        boundaries: profile.boundaries ?? {},
        summary: profile.summary ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('[Emotion Resonance] Failed to upsert style profile', error);
    throw error;
  }
}


