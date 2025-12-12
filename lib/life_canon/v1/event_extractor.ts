// Life Canon v1 - Event Extractor
// lib/life_canon/v1/event_extractor.ts

import { supabaseAdminClient } from '../../supabase/admin';
import { callAIJson } from '@/lib/ai/call';
import { EVENT_EXTRACTOR_PROMPT } from './narrative_prompts';
import { buildLifeCanonContext } from './context';
import { CanonEvent } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdminClient
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function extractCanonEventsForUser(userId: string, now: Date) {
  const dbUserId = await resolveUserId(userId);
  const context = await buildLifeCanonContext(userId, now);

  const result = await callAIJson<{
    events: Array<{
      eventType: string;
      title: string;
      description?: string;
      importance: number;
      emotionalTone?: any;
      consequences?: any;
    }>;
  }>({
    userId,
    feature: 'life_canon_events',
    systemPrompt: EVENT_EXTRACTOR_PROMPT,
    userPrompt: `Context:\n${JSON.stringify(context, null, 2)}`,
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    throw new Error(`Failed to extract events: ${result.error}`);
  }

  const events = result.data.events ?? [];

  // Get active chapter
  const { data: activeChapter } = await supabaseAdminClient
    .from('life_chapters')
    .select('id')
    .eq('user_id', dbUserId)
    .is('end_time', null)
    .order('chapter_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Insert events
  const eventIds: string[] = [];
  for (const event of events) {
    // Check if similar event already exists (by title in last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
    const { data: existing } = await supabaseAdminClient
      .from('canon_events')
      .select('id')
      .eq('user_id', dbUserId)
      .eq('title', event.title)
      .gte('created_at', sevenDaysAgo)
      .limit(1)
      .maybeSingle();

    if (existing) {
      eventIds.push(existing.id);
      continue;
    }

    const { data: inserted, error } = await supabaseAdminClient
      .from('canon_events')
      .insert({
        user_id: dbUserId,
        event_type: event.eventType,
        title: event.title,
        description: event.description ?? null,
        emotional_tone: event.emotionalTone ?? {},
        consequences: event.consequences ?? {},
        importance: event.importance,
        attached_chapter: activeChapter?.id ?? null,
      })
      .select('id');

    if (error) throw error;
    if (inserted?.[0]?.id) {
      eventIds.push(inserted[0].id);
    }
  }

  return eventIds;
}


