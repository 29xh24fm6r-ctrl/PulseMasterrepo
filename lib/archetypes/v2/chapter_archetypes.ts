// Archetype Engine v2 - Chapter Archetypes
// lib/archetypes/v2/chapter_archetypes.ts

import { supabaseAdminClient } from '../../supabase/admin';
import { callAIJson } from '@/lib/ai/call';
import { ARCHETYPE_ANALYZER_PROMPT } from './prompts';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdminClient
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function updateChapterArchetypesForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const { data: chapters } = await supabaseAdminClient
    .from('life_chapters')
    .select('*')
    .eq('user_id', dbUserId)
    .order('chapter_order', { ascending: true });

  if (!chapters || !chapters.length) return;

  for (const chapter of chapters) {
    // Fetch events inside chapter window
    const { data: events } = await supabaseAdminClient
      .from('canon_events')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('attached_chapter', chapter.id)
      .order('created_at', { ascending: true });

    const result = await callAIJson<{
      currentMix: Array<{
        id: string;
        strength: number;
        mode: 'healthy' | 'shadow';
        notes?: string;
      }>;
    }>({
      userId,
      feature: 'archetype_chapter',
      systemPrompt: ARCHETYPE_ANALYZER_PROMPT,
      userPrompt: `Chapter Context:\n${JSON.stringify({
        chapter,
        chapterEvents: events ?? [],
      }, null, 2)}`,
      maxTokens: 2000,
      temperature: 0.7,
    });

    if (!result.success || !result.data) {
      console.error(`Failed to analyze archetypes for chapter ${chapter.id}`);
      continue;
    }

    const { currentMix } = result.data;
    const primary = currentMix?.[0]?.id ?? null;

    const { error } = await supabaseAdminClient
      .from('chapter_archetypes')
      .upsert(
        {
          user_id: dbUserId,
          chapter_id: chapter.id,
          archetype_mix: currentMix ?? [],
          primary_archetype_id: primary,
          notes: null,
        },
        { onConflict: 'chapter_id' }
      );

    if (error) {
      console.error(`Failed to upsert chapter archetypes for chapter ${chapter.id}`, error);
    }
  }
}


