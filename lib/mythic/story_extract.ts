// Mythic Intelligence Layer v1 - Story Extraction
// lib/mythic/story_extract.ts

import { supabaseAdminClient } from '../supabase/admin';
import { callAIJson } from '@/lib/ai/call';
import { LifeChapter, MythicProfile, KeyEvent } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdminClient
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function buildLifeChaptersForUser(userId: string): Promise<LifeChapter[]> {
  const dbUserId = await resolveUserId(userId);

  // Gather data from various sources
  const [memoryRes, identityRes, emotionRes, dealsRes] = await Promise.all([
    supabaseAdminClient
      .from('memory_events')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: true })
      .limit(100),
    supabaseAdminClient
      .from('identity_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false })
      .limit(10),
    supabaseAdminClient
      .from('emotion_state_daily')
      .select('*')
      .eq('user_id', dbUserId)
      .order('date', { ascending: false })
      .limit(90),
    supabaseAdminClient
      .from('deals')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: true })
      .limit(50),
  ]);

  const memories = memoryRes.data ?? [];
  const identitySnapshots = identityRes.data ?? [];
  const emotionStates = emotionRes.data ?? [];
  const deals = dealsRes.data ?? [];

  // Build context for LLM
  const events: KeyEvent[] = [
    ...memories.slice(0, 20).map((m: any) => ({
      id: m.id,
      title: m.title || m.content?.substring(0, 50) || 'Memory Event',
      date: m.created_at,
      source: 'memory',
      metadata: m,
    })),
    ...deals.slice(0, 10).map((d: any) => ({
      id: d.id,
      title: d.name || `Deal: ${d.id}`,
      date: d.created_at,
      source: 'deal',
      metadata: d,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Use LLM to identify chapters
  const result = await callAIJson<{
    chapters: Array<{
      chapter_name: string;
      timeframe_start: string;
      timeframe_end: string | null;
      key_events: KeyEvent[];
      emotional_tone: string;
      lesson: string | null;
      dominant_archetype_slug: string | null;
    }>;
  }>({
    userId,
    feature: 'mythic_story_extract',
    systemPrompt: `You are the Mythic Story Extractor for Pulse. Your job is to identify distinct life chapters from a user's events, memories, and emotional patterns.

Analyze the provided events and identify natural chapter boundaries based on:
- Major life transitions (jobs, moves, relationships, crises)
- Emotional shifts (prolonged states of stress, joy, growth, collapse)
- Identity shifts (from identity snapshots)
- Time gaps or natural breaks

For each chapter, provide:
- chapter_name: A poetic, mythic name (e.g., "The Dark Forest of Scaling", "The Builder's Foundation")
- timeframe_start: ISO date string
- timeframe_end: ISO date string or null if ongoing
- key_events: Array of event IDs that belong to this chapter
- emotional_tone: One of: 'ascend', 'collapse', 'dark_forest', 'rebirth', 'foundation', 'transformation', 'stagnation'
- lesson: A brief lesson or theme from this chapter
- dominant_archetype_slug: One of: 'hero', 'builder', 'wanderer', 'sage', 'magician', or null

Return JSON with a chapters array.`,
    userPrompt: `Events:\n${JSON.stringify(events, null, 2)}\n\nIdentity Snapshots:\n${JSON.stringify(identitySnapshots.slice(0, 3), null, 2)}\n\nEmotion States (last 90 days):\n${JSON.stringify(emotionStates.slice(0, 30), null, 2)}`,
    maxTokens: 4000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    throw new Error(`Failed to extract life chapters: ${result.error}`);
  }

  const { chapters } = result.data;

  // Get archetype IDs for slugs
  const archetypeSlugs = chapters
    .map((c) => c.dominant_archetype_slug)
    .filter((s): s is string => s !== null);
  
  const { data: archetypes } = await supabaseAdminClient
    .from('mythic_archetypes')
    .select('id, slug')
    .in('slug', archetypeSlugs);

  const archetypeMap = new Map(archetypes?.map((a: any) => [a.slug, a.id]) ?? []);

  // Insert chapters
  const chapterRows = chapters.map((c) => ({
    user_id: dbUserId,
    chapter_name: c.chapter_name,
    timeframe_start: c.timeframe_start,
    timeframe_end: c.timeframe_end,
    dominant_archetype_id: c.dominant_archetype_slug
      ? archetypeMap.get(c.dominant_archetype_slug) ?? null
      : null,
    key_events: c.key_events,
    emotional_tone: c.emotional_tone,
    lesson: c.lesson,
    status: c.timeframe_end ? 'archived' : 'active',
  }));

  // Archive old active chapters
  await supabaseAdminClient
    .from('life_chapters')
    .update({ status: 'archived' })
    .eq('user_id', dbUserId)
    .eq('status', 'active');

  const { data: insertedChapters, error } = await supabaseAdminClient
    .from('life_chapters')
    .insert(chapterRows)
    .select('*');

  if (error) throw error;

  return insertedChapters ?? [];
}

export async function refreshUserMythicProfile(userId: string): Promise<MythicProfile> {
  const dbUserId = await resolveUserId(userId);

  // Get current chapters
  const { data: chapters } = await supabaseAdminClient
    .from('life_chapters')
    .select('*')
    .eq('user_id', dbUserId)
    .order('timeframe_start', { ascending: false });

  const currentChapter = chapters?.find((c) => c.status === 'active') ?? chapters?.[0] ?? null;

  // Analyze recurring motifs and dominant archetypes
  const result = await callAIJson<{
    dominant_life_archetypes: Array<{ archetype_slug: string; weight: number }>;
    recurring_motifs: string[];
    current_phase: 'setup' | 'departure' | 'ordeal' | 'return' | 'integration';
  }>({
    userId,
    feature: 'mythic_profile_refresh',
    systemPrompt: `You are analyzing a user's mythic profile. Based on their life chapters, identify:
1. Dominant life archetypes (with weights 0-1)
2. Recurring motifs (themes that repeat across chapters)
3. Current phase in the hero's journey

Return JSON with these fields.`,
    userPrompt: `Chapters:\n${JSON.stringify(chapters?.slice(0, 10), null, 2)}`,
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    throw new Error(`Failed to refresh mythic profile: ${result.error}`);
  }

  const { dominant_life_archetypes, recurring_motifs, current_phase } = result.data;

  // Resolve archetype slugs to IDs
  const archetypeSlugs = dominant_life_archetypes.map((a) => a.archetype_slug);
  const { data: archetypes } = await supabaseAdminClient
    .from('mythic_archetypes')
    .select('id, slug')
    .in('slug', archetypeSlugs);

  const archetypeMap = new Map(archetypes?.map((a: any) => [a.slug, a.id]) ?? []);

  const dominantArchetypes = dominant_life_archetypes
    .map((a) => ({
      archetype_id: archetypeMap.get(a.archetype_slug) ?? '',
      weight: a.weight,
    }))
    .filter((a) => a.archetype_id);

  const profileData = {
    user_id: dbUserId,
    dominant_life_archetypes: dominantArchetypes,
    recurring_motifs: recurring_motifs,
    current_chapter_id: currentChapter?.id ?? null,
    current_phase: current_phase,
    last_story_refresh_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabaseAdminClient
    .from('user_mythic_profile')
    .select('*')
    .eq('user_id', dbUserId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabaseAdminClient
      .from('user_mythic_profile')
      .update(profileData)
      .eq('user_id', dbUserId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabaseAdminClient
      .from('user_mythic_profile')
      .insert({ ...profileData, created_at: new Date().toISOString() })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }
}


