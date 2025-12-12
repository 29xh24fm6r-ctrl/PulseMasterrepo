// Life Theme Detection
// lib/narrative/themes.ts

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

const LIFE_THEMES_SYSTEM_PROMPT = `
You are a narrative analyst.

You see the user's life events and chapters.

Identify 3–12 recurring themes in this person's life.
Examples: "reinvention after setback", "craft mastery", "family resilience", "financial chaos", "service and leadership".

For each theme, provide:
- key (machine-friendly, snake_case),
- name (user-friendly),
- description,
- domain(s) (e.g., ['work'], ['family','self']),
- strength (0–1),
- exampleEventIds (life_event ids where the theme is clear),
- firstAppearedAt and lastActiveAt (dates as strings if obvious).

Return JSON: { "themes": [ ... ] }.

Only return valid JSON.`;

export async function refreshLifeThemesForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const { data: events } = await supabaseAdmin
    .from('life_events')
    .select('*')
    .eq('user_id', dbUserId)
    .order('occurred_at', { ascending: true });

  const { data: chapters } = await supabaseAdmin
    .from('life_chapters')
    .select('*')
    .eq('user_id', dbUserId)
    .order('chapter_index', { ascending: true });

  if ((!events || events.length === 0) && (!chapters || chapters.length === 0)) {
    console.warn('[Narrative] No events or chapters found, skipping theme detection');
    return;
  }

  const result = await callAIJson<{
    themes: Array<{
      key: string;
      name: string;
      description?: string;
      domain: string[];
      strength: number;
      exampleEventIds?: string[];
      firstAppearedAt?: string;
      lastActiveAt?: string;
    }>;
  }>({
    userId,
    feature: 'narrative_themes',
    systemPrompt: LIFE_THEMES_SYSTEM_PROMPT,
    userPrompt: JSON.stringify({
      events: (events || []).slice(0, 100),
      chapters: chapters || [],
    }, null, 2),
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data || !result.data.themes?.length) {
    console.warn('[Narrative] No themes generated');
    return;
  }

  const { themes } = result.data;

  // Map event IDs to UUIDs
  const eventIdMap: Record<string, string> = {};
  (events || []).forEach((e: any) => {
    if (e.title) {
      // Simple matching by title (v1 heuristic)
      eventIdMap[e.title] = e.id;
    }
  });

  const rows = themes.map((t) => ({
    user_id: dbUserId,
    key: t.key,
    name: t.name,
    description: t.description ?? null,
    domain: t.domain ?? [],
    strength: t.strength,
    example_event_ids: (t.exampleEventIds || [])
      .map((id: string) => {
        // Try to find matching event by title or use as-is if UUID
        return eventIdMap[id] || id;
      })
      .filter((id: string) => id.length > 0),
    first_appeared_at: t.firstAppearedAt ?? null,
    last_active_at: t.lastActiveAt ?? null,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabaseAdmin
    .from('life_themes')
    .upsert(rows, { onConflict: 'user_id,key' });

  if (error) {
    console.error('[Narrative] Failed to upsert themes', error);
    throw error;
  }
}


