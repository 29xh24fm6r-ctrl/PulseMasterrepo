// Wisdom Aggregator (Experiences → Lessons)
// lib/wisdom/aggregator.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { WisdomLesson } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const WISDOM_LESSON_SYSTEM_PROMPT = `
You are the Wisdom Engine for a life OS.

You receive a set of experience events for the user over some period.

Each event includes:
- What was attempted (action, prediction, advice, decision).
- The context (energy, emotion, narrative, workspace, relationships).
- The expected outcome.
- The actual outcome and evaluation.

Your job:
1. Look for patterns across these events:
   - What tends to work well for this user?
   - What tends to fail or backfire?
   - In what conditions (energy, emotion, chapter, relationships) do certain strategies succeed or fail?

2. Distill ~3–15 "lessons" that are:
   - specific,
   - actionable,
   - rooted in recurring patterns (not one-off anomalies).

Each lesson should include:
- title: short, memorable.
- summary: 1–3 sentence explanation.
- domain: 'work', 'relationships', 'health', 'finance', 'self', or combinations.
- condition: structured description of the situation (features of context where lesson applies).
- recommendation: structured description of what to do.
- avoid: structured description of what not to do in that context.
- evidence: references to the events that back this up.
- strength: 0–1, your confidence in this lesson for this user.
- usefulness: 0–1, your estimate of how practically useful this is.

Return JSON: { "lessons": [ ... ] }.

Only return valid JSON.`;

export async function refreshWisdomLessonsForUser(userId: string, since: Date, until: Date) {
  const dbUserId = await resolveUserId(userId);

  const { data: events, error } = await supabaseAdmin
    .from('experience_events')
    .select('*')
    .eq('user_id', dbUserId)
    .gte('occurred_at', since.toISOString())
    .lte('occurred_at', until.toISOString())
    .order('occurred_at', { ascending: true })
    .limit(200); // Limit for context

  if (error) throw error;
  if (!events || events.length === 0) {
    console.warn('[Wisdom] No experience events found for lesson generation');
    return;
  }

  const result = await callAIJson<{ lessons: WisdomLesson[] }>({
    userId,
    feature: 'wisdom_lessons',
    systemPrompt: WISDOM_LESSON_SYSTEM_PROMPT,
    userPrompt: JSON.stringify({
      events: events.slice(0, 100), // Limit for LLM context
    }, null, 2),
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data || !result.data.lessons?.length) {
    console.warn('[Wisdom] No lessons generated');
    return;
  }

  const { lessons } = result.data;

  const rows = lessons.map((l) => ({
    user_id: dbUserId,
    status: l.status ?? 'active',
    scope: l.scope ?? 'personal',
    domain: l.domain ?? null,
    title: l.title,
    summary: l.summary ?? null,
    condition: l.condition ?? {},
    recommendation: l.recommendation ?? {},
    avoid: l.avoid ?? {},
    evidence: l.evidence ?? {},
    strength: l.strength ?? 0.5,
    usefulness: l.usefulness ?? 0.5,
    updated_at: new Date().toISOString(),
  }));

  const { error: insertError } = await supabaseAdmin
    .from('wisdom_lessons')
    .insert(rows);

  if (insertError) {
    console.error('[Wisdom] Failed to insert lessons', insertError);
    throw insertError;
  }
}


