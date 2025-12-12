// Life Chapter Segmentation
// lib/narrative/chapters.ts

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

const LIFE_CHAPTERS_SYSTEM_PROMPT = `
You are the Narrative Intelligence Engine.

You receive:
- A chronological list of "life events" (career, relationships, health, etc.).
- Daily emotional summaries.

Your job:
1. Segment this history into 2–10 "chapters" of the user's life.
   Each chapter should:
   - have a startDate and endDate (endDate can be null for current chapter),
   - have a title and optional tagline,
   - be tagged with primary roles and themes,
   - have a brief summary.

2. Mark exactly one chapter as 'active' (current).

3. Earlier chapters are 'past'. You may include 'planned' future chapters if story implies it.

Return JSON: { "chapters": [ ... ] }.

Only return valid JSON.`;

export async function refreshLifeChaptersForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);

  // 1. Load all life_events, emotion_state_daily, key identity info
  const { data: events } = await supabaseAdmin
    .from('life_events')
    .select('*')
    .eq('user_id', dbUserId)
    .order('occurred_at', { ascending: true });

  if (!events || events.length === 0) {
    console.warn('[Narrative] No life events found, skipping chapter segmentation');
    return;
  }

  const { data: emotionDays } = await supabaseAdmin
    .from('emotion_state_daily')
    .select('*')
    .eq('user_id', dbUserId)
    .order('state_date', { ascending: true });

  // 2. Pass to LLM for chapter segmentation
  const result = await callAIJson<{
    chapters: Array<{
      chapterIndex: number;
      title: string;
      tagline?: string;
      startDate: string;
      endDate?: string | null;
      status: 'active' | 'past' | 'planned';
      dominantThemes?: string[];
      primaryRoles?: string[];
      emotionalTone?: any;
      summary?: string;
    }>;
  }>({
    userId,
    feature: 'narrative_chapters',
    systemPrompt: LIFE_CHAPTERS_SYSTEM_PROMPT,
    userPrompt: JSON.stringify({
      events: events.slice(0, 100), // Limit for context
      emotionDays: (emotionDays || []).slice(0, 90), // Last 90 days
    }, null, 2),
    maxTokens: 2500,
    temperature: 0.7,
  });

  if (!result.success || !result.data || !result.data.chapters?.length) {
    console.warn('[Narrative] No chapters generated');
    return;
  }

  const { chapters } = result.data;

  // 3. Upsert into life_chapters
  const rows = chapters.map((c) => ({
    user_id: dbUserId,
    chapter_index: c.chapterIndex,
    title: c.title,
    tagline: c.tagline ?? null,
    start_date: c.startDate,
    end_date: c.endDate ?? null,
    status: c.status,
    dominant_themes: c.dominantThemes ?? [],
    primary_roles: c.primaryRoles ?? [],
    emotional_tone: c.emotionalTone ?? {},
    summary: c.summary ?? null,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabaseAdmin
    .from('life_chapters')
    .upsert(rows, { onConflict: 'user_id,chapter_index' });

  if (error) {
    console.error('[Narrative] Failed to upsert chapters', error);
    throw error;
  }
}


