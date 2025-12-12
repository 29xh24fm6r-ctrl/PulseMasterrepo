// Heuristics Builder (Lessons → Heuristics)
// lib/wisdom/lessons.ts

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

const HEURISTICS_FROM_LESSONS_SYSTEM_PROMPT = `
You are compressing wisdom into fast decision rules.

You receive a list of lessons, each with:
- condition (when it applies),
- recommendation (what works),
- avoid (what fails),
- strength and usefulness.

Your job:
1. Merge related lessons into compact heuristics for quick use.
2. Each heuristic should be a simple rule like:
   - "When energy is low and stress is high, cap deep work blocks at 60 minutes."
   - "If a relationship has high drift and high importance, prioritize a small, low-pressure touchpoint this week."

Each heuristic:
- key: machine-friendly string.
- description: short user-friendly description.
- domain: primary life domain.
- rule: structured representation with:
  - when: conditions/features,
  - prefer: recommended strategy,
  - avoid: strategies to not use.
- strength: 0–1.

Return JSON: { "heuristics": [ ... ] }.

Only return valid JSON.`;

export async function rebuildHeuristicsFromLessons(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const { data: lessons, error } = await supabaseAdmin
    .from('wisdom_lessons')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('status', 'active')
    .limit(100);

  if (error) throw error;
  if (!lessons || lessons.length === 0) {
    console.warn('[Wisdom] No active lessons found for heuristic generation');
    return;
  }

  const result = await callAIJson<{
    heuristics: Array<{
      key: string;
      description: string;
      domain?: string;
      rule: any;
      strength: number;
    }>;
  }>({
    userId,
    feature: 'wisdom_heuristics',
    systemPrompt: HEURISTICS_FROM_LESSONS_SYSTEM_PROMPT,
    userPrompt: JSON.stringify({
      lessons: lessons.slice(0, 50), // Limit for LLM context
    }, null, 2),
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data || !result.data.heuristics?.length) {
    console.warn('[Wisdom] No heuristics generated');
    return;
  }

  const { heuristics } = result.data;

  const rows = heuristics.map((h) => ({
    user_id: dbUserId,
    key: h.key,
    description: h.description,
    domain: h.domain ?? null,
    rule: h.rule ?? {},
    strength: h.strength ?? 0.5,
    updated_at: new Date().toISOString(),
  }));

  const { error: upsertError } = await supabaseAdmin
    .from('personal_heuristics')
    .upsert(rows, { onConflict: 'user_id,key' });

  if (upsertError) {
    console.error('[Wisdom] Failed to upsert heuristics', upsertError);
    throw upsertError;
  }
}


