// Wisdom Playbooks Builder
// lib/wisdom/playbooks.ts

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

const PLAYBOOKS_SYSTEM_PROMPT = `
You are writing "playbooks" for the user's life.

You receive:
- Active wisdom lessons.
- Personal heuristics.

Your job:
1. Identify 3–10 recurring scenarios in this user's life, such as:
   - "Overwhelmed workday"
   - "Post-conflict with partner"
   - "High-temptation spending mood"
   - "Low energy but high stakes day"

2. For each scenario, define a playbook:
   - key, name, description, domain
   - triggerPattern: when this playbook is relevant (context features)
   - lessonIds and heuristicIds: which wisdom pieces belong to this playbook.

Return JSON: { "playbooks": [ ... ] }.

Only return valid JSON.`;

export async function refreshWisdomPlaybooksForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const { data: lessons, error: lessonsError } = await supabaseAdmin
    .from('wisdom_lessons')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('status', 'active')
    .limit(100);

  if (lessonsError) throw lessonsError;

  const { data: heuristics, error: heuristicsError } = await supabaseAdmin
    .from('personal_heuristics')
    .select('*')
    .eq('user_id', dbUserId)
    .limit(100);

  if (heuristicsError) throw heuristicsError;

  if ((!lessons || lessons.length === 0) && (!heuristics || heuristics.length === 0)) {
    console.warn('[Wisdom] No lessons or heuristics found for playbook generation');
    return;
  }

  const result = await callAIJson<{
    playbooks: Array<{
      key: string;
      name: string;
      description?: string;
      domain?: string;
      triggerPattern: any;
      lessonIds: string[];
      heuristicIds: string[];
    }>;
  }>({
    userId,
    feature: 'wisdom_playbooks',
    systemPrompt: PLAYBOOKS_SYSTEM_PROMPT,
    userPrompt: JSON.stringify({
      lessons: (lessons || []).slice(0, 50).map((l: any) => ({
        id: l.id,
        title: l.title,
        summary: l.summary,
        condition: l.condition,
        domain: l.domain,
      })),
      heuristics: (heuristics || []).slice(0, 50).map((h: any) => ({
        id: h.id,
        key: h.key,
        description: h.description,
        rule: h.rule,
        domain: h.domain,
      })),
    }, null, 2),
    maxTokens: 2500,
    temperature: 0.7,
  });

  if (!result.success || !result.data || !result.data.playbooks?.length) {
    console.warn('[Wisdom] No playbooks generated');
    return;
  }

  const { playbooks } = result.data;

  // Map lesson/heuristic IDs from titles/keys to actual UUIDs
  const lessonIdMap: Record<string, string> = {};
  (lessons || []).forEach((l: any) => {
    lessonIdMap[l.title] = l.id;
  });

  const heuristicIdMap: Record<string, string> = {};
  (heuristics || []).forEach((h: any) => {
    heuristicIdMap[h.key] = h.id;
  });

  const rows = playbooks.map((p) => ({
    user_id: dbUserId,
    key: p.key,
    name: p.name,
    description: p.description ?? null,
    domain: p.domain ?? null,
    trigger_pattern: p.triggerPattern ?? {},
    lesson_ids: (p.lessonIds || [])
      .map((id: string) => {
        // Try to find by title or use as-is if UUID
        return lessonIdMap[id] || id;
      })
      .filter((id: string) => id.length > 0),
    heuristic_ids: (p.heuristicIds || [])
      .map((id: string) => {
        // Try to find by key or use as-is if UUID
        return heuristicIdMap[id] || id;
      })
      .filter((id: string) => id.length > 0),
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabaseAdmin
    .from('wisdom_playbooks')
    .upsert(rows, { onConflict: 'user_id,key' });

  if (error) {
    console.error('[Wisdom] Failed to upsert playbooks', error);
    throw error;
  }
}


