// Wisdom Middleware (Query Wisdom for Context)
// lib/wisdom/middleware.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { ExperienceContext } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const WISDOM_SELECTION_SYSTEM_PROMPT = `
You are the Wisdom Engine at decision time.

You receive:
- Current context (emotion, energy, narrative, workspace, social, identity).
- All wisdom lessons, heuristics, and playbooks for this user.

Your job:
1. Select the small subset that is most relevant to this current moment.
2. Return:
   - relevantLessons (subset),
   - relevantHeuristics (subset),
   - relevantPlaybooks (subset),
   - distilledGuidance: a short, actionable narrative like
     "Given your low energy and past failures when overcommitting on days like this, limit major tasks to 2 and front-load relationship repair."

Return JSON: { "selected": { ... } }.

Only return valid JSON.`;

export async function getWisdomForContext(userId: string, context: ExperienceContext) {
  const dbUserId = await resolveUserId(userId);

  const [lessonsRes, heuristicsRes, playbooksRes] = await Promise.all([
    supabaseAdmin
      .from('wisdom_lessons')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('status', 'active'),
    supabaseAdmin
      .from('personal_heuristics')
      .select('*')
      .eq('user_id', dbUserId),
    supabaseAdmin
      .from('wisdom_playbooks')
      .select('*')
      .eq('user_id', dbUserId),
  ]);

  const lessons = lessonsRes.data || [];
  const heuristics = heuristicsRes.data || [];
  const playbooks = playbooksRes.data || [];

  if (lessons.length === 0 && heuristics.length === 0 && playbooks.length === 0) {
    return {
      relevantLessons: [],
      relevantHeuristics: [],
      relevantPlaybooks: [],
      distilledGuidance: null,
    };
  }

  const result = await callAIJson<{
    selected: {
      relevantLessons: any[];
      relevantHeuristics: any[];
      relevantPlaybooks: any[];
      distilledGuidance: string;
    };
  }>({
    userId,
    feature: 'wisdom_selection',
    systemPrompt: WISDOM_SELECTION_SYSTEM_PROMPT,
    userPrompt: JSON.stringify({
      context,
      lessons: lessons.slice(0, 50),
      heuristics: heuristics.slice(0, 50),
      playbooks: playbooks.slice(0, 20),
    }, null, 2),
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Wisdom] Failed to select wisdom', result.error);
    return {
      relevantLessons: [],
      relevantHeuristics: [],
      relevantPlaybooks: [],
      distilledGuidance: null,
    };
  }

  return result.data.selected;
}


