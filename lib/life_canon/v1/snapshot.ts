// Life Canon v1 - Snapshot Generator
// lib/life_canon/v1/snapshot.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';
import { callAIJson } from '@/lib/ai/call';
import { NARRATIVE_SNAPSHOT_PROMPT } from './narrative_prompts';
import { buildCurrentChapterForUser } from './chapter_builder';
import { extractCanonEventsForUser } from './event_extractor';
import { detectIdentityShiftsForUser } from './identity_shift_detector';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function createLifeCanonSnapshotForUser(userId: string, now: Date) {
  const dbUserId = await resolveUserId(userId);

  // Build current chapter
  const { chapterId, chapter, prediction } = await buildCurrentChapterForUser(userId, now);

  // Extract canon events
  const eventIds = await extractCanonEventsForUser(userId, now);

  // Get recent events
  const { data: recentEvents } = await supabaseAdmin
    .from('canon_events')
    .select('*')
    .eq('user_id', dbUserId)
    .in('id', eventIds)
    .order('created_at', { ascending: false });

  // Detect identity shifts
  const identityTransformId = await detectIdentityShiftsForUser(userId, now);

  // Get active themes from chapter
  const activeThemes = chapter.themes ?? { rising: [], fading: [] };

  // Generate narrative summary
  const narrativeResult = await callAIJson<{
    narrativeSummary: string;
  }>({
    userId,
    feature: 'life_canon_narrative',
    systemPrompt: NARRATIVE_SNAPSHOT_PROMPT,
    userPrompt: `Current Chapter: ${JSON.stringify(chapter, null, 2)}\n\nRecent Events: ${JSON.stringify(recentEvents ?? [], null, 2)}`,
    maxTokens: 1500,
    temperature: 0.7,
  });

  const narrativeSummary =
    narrativeResult.success && narrativeResult.data
      ? narrativeResult.data.narrativeSummary
      : null;

  // Save snapshot
  const { data: snapshot, error } = await supabaseAdmin
    .from('life_canon_snapshots')
    .insert({
      user_id: dbUserId,
      active_chapter: chapter,
      recent_events: recentEvents ?? [],
      active_themes: activeThemes,
      narrative_summary: narrativeSummary,
      predicted_next_chapter: prediction,
      upcoming_turning_points: prediction?.turningPoints ?? [],
    })
    .select('id');

  if (error) throw error;

  return {
    snapshotId: snapshot?.[0]?.id as string,
    chapterId,
    chapter,
    recentEvents: recentEvents ?? [],
    activeThemes,
    narrativeSummary,
    prediction,
    identityTransformId,
  };
}


