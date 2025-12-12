// Emotion Resonance Learning
// lib/emotion/resonance/resonance_learning.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const RESONANCE_EVENT_SUMMARY_PROMPT = `
You are the Resonance Event Summarizer.

You see:
- An emotion interaction with a high resonance score (very positive or very negative).

Your job:
- Write a short summary explaining what happened and why it resonated.
- Extract pattern_tags that describe the style/context that worked or didn't work.

Return JSON: { "summary": "...", "patternTags": { ... } }.

Only return valid JSON.`;

export async function deriveResonanceEventsForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const { data: interactions, error } = await supabaseAdmin
    .from('emotion_interaction_log')
    .select('*')
    .eq('user_id', dbUserId)
    .order('occurred_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('[Emotion Resonance] Failed to fetch interactions', error);
    throw error;
  }

  if (!interactions?.length) return;

  // Find significant interactions (high or low resonance scores)
  const significant = interactions.filter((i) => {
    const score = i.resonance_score ?? 0.5;
    return score >= 0.75 || score <= 0.25;
  });

  if (!significant.length) return;

  // Generate summaries for significant events
  const rows = [];
  for (const i of significant.slice(0, 50)) {
    const result = await callAIJson<{ summary: string; patternTags: any }>({
      userId,
      feature: 'resonance_event_summary',
      systemPrompt: RESONANCE_EVENT_SUMMARY_PROMPT,
      userPrompt: JSON.stringify({
        channel: i.channel,
        context: i.context,
        inputEmotionState: i.input_emotion_state || {},
        responseStyle: i.response_style || {},
        interventionKind: i.intervention_kind,
        outcomeEmotionState: i.outcome_emotion_state || {},
        resonanceScore: i.resonance_score,
      }, null, 2),
      maxTokens: 500,
      temperature: 0.7,
    });

    const direction = (i.resonance_score ?? 0.5) >= 0.5 ? 'positive' : 'negative';
    const magnitude = Math.abs((i.resonance_score ?? 0.5) - 0.5) * 2;

    rows.push({
      user_id: dbUserId,
      interaction_id: i.id,
      direction,
      magnitude,
      summary: result.success && result.data ? result.data.summary : `Resonance event (${direction})`,
      pattern_tags: result.success && result.data ? result.data.patternTags : {},
    });
  }

  if (!rows.length) return;

  const { error: insertError } = await supabaseAdmin
    .from('emotion_resonance_events')
    .insert(rows);

  if (insertError) {
    console.error('[Emotion Resonance] Failed to insert resonance events', insertError);
    throw insertError;
  }
}


