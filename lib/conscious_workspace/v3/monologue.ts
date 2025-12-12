// Inner Monologue Engine v2
// lib/conscious_workspace/v3/monologue.ts

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

const INNER_MONOLOGUE_PROMPT = `
You are the Inner Monologue Engine.

You see:
- The current conscious_frame summary.
- Selected focus items (the main things to think about).
- Recent monologue turns (last ~20 steps).

Your job:
1. Continue the chain of thought in a way that:
   - Respects continuity (don't restart from scratch).
   - Is grounded in the user's values, destiny, and context.
   - Moves things forward (analysis, planning, reflection, self-check).

2. For each step:
   - Pick a focusItemId (or null if meta-level).
   - mode: 'analysis', 'reflection', 'planning', 'self_check', or 'prediction'.
   - content: concise but meaningful inner speech.
   - referencedSubsystems: which subsystems you implicitly consult (e.g. ['destiny_engine', 'emotion_os']).
   - derivedActions: any suggested tasks or decisions (if applicable).
   - emotionalTone: { valence, arousal, stance }.

Write as *internal monologue* to yourself, not direct user-facing text.

Return JSON: { "turns": [ ... ] }.

Only return valid JSON.`;

export async function runInnerMonologueForFrame(userId: string, frameId: string) {
  const dbUserId = await resolveUserId(userId);

  const [{ data: frameRows }, { data: items }, { data: recentMonologue }] = await Promise.all([
    supabaseAdmin
      .from('conscious_frames')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('id', frameId)
      .limit(1),
    supabaseAdmin
      .from('conscious_items')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('frame_id', frameId)
      .eq('selected', true)
      .order('attention_score', { ascending: false }),
    supabaseAdmin
      .from('inner_monologue_turns')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const frame = frameRows?.[0];
  if (!frame || !items?.length) {
    console.warn('[Inner Monologue] No frame or selected items found');
    return [];
  }

  const result = await callAIJson<{
    turns: Array<{
      focusItemId?: string;
      mode: string;
      content: string;
      referencedSubsystems?: string[];
      derivedActions?: any;
      emotionalTone?: any;
    }>;
  }>({
    userId,
    feature: 'inner_monologue',
    systemPrompt: INNER_MONOLOGUE_PROMPT,
    userPrompt: JSON.stringify({
      frame: {
        summary: frame.summary,
        dominantContext: frame.dominant_context || {},
        overallUrgency: frame.overall_urgency,
        overallComplexity: frame.overall_complexity,
        overallLoad: frame.overall_load,
      },
      items: items.map((i: any) => ({
        id: i.id,
        sourceSubsystem: i.source_subsystem,
        kind: i.kind,
        title: i.title,
        description: i.description,
        domain: i.domain,
        urgency: i.urgency,
        importance: i.importance,
        emotionalSalience: i.emotional_salience,
      })),
      recentMonologue: (recentMonologue || []).slice(0, 10).map((m: any) => ({
        mode: m.mode,
        content: m.content,
        referencedSubsystems: m.referenced_subsystems || [],
      })),
    }, null, 2),
    maxTokens: 3000,
    temperature: 0.8, // Slightly higher for more natural monologue flow
  });

  if (!result.success || !result.data || !result.data.turns?.length) {
    console.error('[Inner Monologue] Failed to generate turns', result.error);
    return [];
  }

  const { turns } = result.data;

  const rows = turns.map((t, idx) => ({
    user_id: dbUserId,
    frame_id: frameId,
    focus_item_id: t.focusItemId ?? null,
    step_index: idx,
    mode: t.mode,
    content: t.content,
    referenced_subsystems: t.referencedSubsystems ?? [],
    derived_actions: t.derivedActions ?? {},
    emotional_tone: t.emotionalTone ?? {},
  }));

  const { error } = await supabaseAdmin
    .from('inner_monologue_turns')
    .insert(rows);

  if (error) {
    console.error('[Inner Monologue] Failed to insert turns', error);
    throw error;
  }

  return rows;
}


