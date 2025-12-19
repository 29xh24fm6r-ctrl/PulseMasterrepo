// Life Canon v1 - Chapter Builder
// lib/life_canon/v1/chapter_builder.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';
import { callAIJson } from '@/lib/ai/call';
import { CHAPTER_BUILDER_PROMPT } from './narrative_prompts';
import { buildLifeCanonContext } from './context';
import { LifeChapter } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function buildCurrentChapterForUser(userId: string, now: Date) {
  const dbUserId = await resolveUserId(userId);
  const context = await buildLifeCanonContext(userId, now);

  const result = await callAIJson<{
    chapter: {
      title: string;
      subtitle?: string;
      summary?: string;
      tone?: any;
      themes?: { rising?: string[]; fading?: string[] };
      internalConflicts?: any[];
      externalConflicts?: any[];
      identityState?: any;
      destinyState?: any;
      relationshipState?: any;
      somaticState?: any;
    };
    prediction: {
      nextChapter?: string;
      turningPoints?: any[];
    };
  }>({
    userId,
    feature: 'life_canon_chapter',
    systemPrompt: CHAPTER_BUILDER_PROMPT,
    userPrompt: `Context:\n${JSON.stringify(context, null, 2)}`,
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    throw new Error(`Failed to build chapter: ${result.error}`);
  }

  const { chapter, prediction } = result.data;

  // Get the highest chapter order
  const { data: existingChapters } = await supabaseAdmin
    .from('life_chapters')
    .select('chapter_order')
    .eq('user_id', dbUserId)
    .order('chapter_order', { ascending: false })
    .limit(1);

  const nextOrder = existingChapters?.[0]?.chapter_order
    ? existingChapters[0].chapter_order + 1
    : 1;

  // Check if there's an active chapter (no end_time)
  const { data: activeChapter } = await supabaseAdmin
    .from('life_chapters')
    .select('*')
    .eq('user_id', dbUserId)
    .is('end_time', null)
    .order('chapter_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  let chapterId: string;

  if (activeChapter) {
    // Update existing active chapter
    const { data: updated, error } = await supabaseAdmin
      .from('life_chapters')
      .update({
        updated_at: now.toISOString(),
        title: chapter.title,
        subtitle: chapter.subtitle ?? null,
        summary: chapter.summary ?? null,
        tone: chapter.tone ?? {},
        themes: chapter.themes ?? {},
        internal_conflicts: chapter.internalConflicts ?? [],
        external_conflicts: chapter.externalConflicts ?? [],
        identity_state: chapter.identityState ?? {},
        destiny_state: chapter.destinyState ?? {},
        relationship_state: chapter.relationshipState ?? {},
        somatic_state: chapter.somaticState ?? {},
      })
      .eq('id', activeChapter.id)
      .select('id');

    if (error) throw error;
    chapterId = updated?.[0]?.id as string;
  } else {
    // Create new chapter
    const { data: created, error } = await supabaseAdmin
      .from('life_chapters')
      .insert({
        user_id: dbUserId,
        chapter_order: nextOrder,
        title: chapter.title,
        subtitle: chapter.subtitle ?? null,
        summary: chapter.summary ?? null,
        start_time: now.toISOString(),
        tone: chapter.tone ?? {},
        themes: chapter.themes ?? {},
        internal_conflicts: chapter.internalConflicts ?? [],
        external_conflicts: chapter.externalConflicts ?? [],
        identity_state: chapter.identityState ?? {},
        destiny_state: chapter.destinyState ?? {},
        relationship_state: chapter.relationshipState ?? {},
        somatic_state: chapter.somaticState ?? {},
      })
      .select('id');

    if (error) throw error;
    chapterId = created?.[0]?.id as string;
  }

  return {
    chapterId,
    chapter: {
      ...chapter,
      id: chapterId,
      chapterOrder: activeChapter?.chapter_order ?? nextOrder,
    },
    prediction,
  };
}


