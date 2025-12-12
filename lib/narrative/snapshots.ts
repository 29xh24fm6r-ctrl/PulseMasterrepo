// Narrative Snapshots
// lib/narrative/snapshots.ts

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

const NARRATIVE_SNAPSHOT_SYSTEM_PROMPT = `
You are the Narrative Intelligence Engine creating a weekly snapshot.

You receive:
- Current life chapter
- Life themes
- Identity arcs
- Recent life events (last 7-14 days)

Your job:
Create a narrative snapshot that answers "Where am I in my story right now?"

Output:
- tensions: Array of { label, details, pressure (0-1) } - conflicts or pressures in the story
- opportunities: Array of { label, details, attractiveness (0-1) } - narrative opportunities
- narrativeSummary: 1–3 paragraphs describing the current moment in the story
- shortLogline: 1-sentence "episode recap"
- activeThemeKeys: array of theme keys that are most relevant right now
- activeIdentityArcKeys: array of arc keys that are most active

Return JSON: { "snapshot": { ... } }.

Only return valid JSON.`;

export async function createWeeklyNarrativeSnapshotForUser(userId: string, weekEnd: Date) {
  const dbUserId = await resolveUserId(userId);

  // 1. Determine current chapter
  const { data: chapters } = await supabaseAdmin
    .from('life_chapters')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('status', 'active')
    .limit(1);

  const chapter = chapters?.[0] ?? null;

  // 2. Load themes and identity arcs
  const { data: themes } = await supabaseAdmin
    .from('life_themes')
    .select('*')
    .eq('user_id', dbUserId);

  const { data: arcs } = await supabaseAdmin
    .from('identity_arcs')
    .select('*')
    .eq('user_id', dbUserId)
    .in('status', ['active']);

  // 3. Load recent life events (e.g., last 7–14 days)
  const from = new Date(weekEnd);
  from.setDate(from.getDate() - 14);

  const { data: events } = await supabaseAdmin
    .from('life_events')
    .select('*')
    .eq('user_id', dbUserId)
    .gte('occurred_at', from.toISOString())
    .lte('occurred_at', weekEnd.toISOString())
    .order('occurred_at', { ascending: false });

  const result = await callAIJson<{
    snapshot: {
      tensions: Array<{ label: string; details: string; pressure: number }>;
      opportunities: Array<{ label: string; details: string; attractiveness: number }>;
      narrativeSummary: string;
      shortLogline: string;
      activeThemeKeys?: string[];
      activeIdentityArcKeys?: string[];
    };
  }>({
    userId,
    feature: 'narrative_snapshot',
    systemPrompt: NARRATIVE_SNAPSHOT_SYSTEM_PROMPT,
    userPrompt: JSON.stringify({
      chapter: chapter ? {
        title: chapter.title,
        tagline: chapter.tagline,
        summary: chapter.summary,
        dominantThemes: chapter.dominant_themes,
        primaryRoles: chapter.primary_roles,
      } : null,
      themes: (themes || []).map((t: any) => ({
        key: t.key,
        name: t.name,
        description: t.description,
        strength: t.strength,
      })),
      arcs: (arcs || []).map((a: any) => ({
        key: a.key,
        name: a.name,
        description: a.description,
        progress: a.progress,
      })),
      events: (events || []).slice(0, 20),
      weekEnd: weekEnd.toISOString(),
    }, null, 2),
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Narrative] Failed to generate snapshot', result.error);
    return;
  }

  const { snapshot } = result.data;

  const { error } = await supabaseAdmin
    .from('narrative_snapshots')
    .insert({
      user_id: dbUserId,
      snapshot_at: weekEnd.toISOString(),
      scope: 'weekly',
      chapter_id: chapter?.id ?? null,
      active_theme_keys: snapshot.activeThemeKeys ?? [],
      active_identity_arc_keys: snapshot.activeIdentityArcKeys ?? [],
      tensions: snapshot.tensions || [],
      opportunities: snapshot.opportunities || [],
      narrative_summary: snapshot.narrativeSummary,
      short_logline: snapshot.shortLogline,
    });

  if (error) {
    console.error('[Narrative] Failed to insert snapshot', error);
    throw error;
  }
}


