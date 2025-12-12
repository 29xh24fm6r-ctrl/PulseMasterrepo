// Narrative Event Extraction
// lib/narrative/events.ts

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

const LIFE_EVENTS_SYSTEM_PROMPT = `
You are the Narrative Intelligence Engine for a user's life OS.

You will see a time window and a list of low-level events (tasks, deals, meetings, changes).

Your job:
- Identify only the events that matter at the story level.
- Group or ignore trivial events.
- Output 1–10 "life events" for this window, such as:
  - "Closed first major deal with X"
  - "Started building Pulse full-time on nights/weekends"
  - "Had serious conflict with spouse about Y"
  - "Made a crucial health decision"

Each life event should include:
- occurredAt (ISO timestamp)
- kind ('career', 'relationship', 'health', 'finance', 'project', 'identity', etc.)
- source ('system', 'journal', 'deal', etc.)
- title (short)
- summary (1–3 sentences)
- impact (0–1)
- emotionalValence (-1 to 1)
- tags (keywords)
- refType/refId if applicable.

Return JSON: { "lifeEvents": [...] }.

Only return valid JSON.`;

export async function refreshLifeEventsForUser(userId: string, since: Date, until: Date) {
  const dbUserId = await resolveUserId(userId);

  // 1. Load candidate signals: brain_events, big deals, new goals, etc.
  // For v1, we'll check if brain_events table exists, otherwise use other sources
  let brainEvents: any[] = [];
  
  try {
    const { data, error } = await supabaseAdmin
      .from('brain_events')
      .select('*')
      .eq('user_id', dbUserId)
      .gte('event_time', since.toISOString())
      .lte('event_time', until.toISOString())
      .limit(100);

    if (!error && data) {
      brainEvents = data;
    }
  } catch (err) {
    // brain_events table might not exist yet, that's okay
    console.warn('[Narrative] brain_events table not found, using alternative sources');
  }

  // Also fetch big deals, goal completions, etc.
  const { data: deals } = await supabaseAdmin
    .from('deals')
    .select('*')
    .eq('user_id', dbUserId)
    .in('status', ['won', 'closed'])
    .gte('updated_at', since.toISOString())
    .lte('updated_at', until.toISOString())
    .limit(20);

  const { data: goals } = await supabaseAdmin
    .from('goals')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('status', 'completed')
    .gte('completed_at', since.toISOString())
    .lte('completed_at', until.toISOString())
    .limit(20);

  // Prepare input for LLM
  const llmInput = {
    window: { from: since.toISOString(), to: until.toISOString() },
    brainEvents: brainEvents.slice(0, 50), // Limit for context
    deals: (deals || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      value: d.value,
      status: d.status,
      updated_at: d.updated_at,
    })),
    goals: (goals || []).map((g: any) => ({
      id: g.id,
      title: g.title,
      completed_at: g.completed_at,
    })),
  };

  const result = await callAIJson<{
    lifeEvents: Array<{
      occurredAt: string;
      kind: string;
      source: string;
      title: string;
      summary?: string;
      impact: number;
      emotionalValence?: number;
      tags?: string[];
      refType?: string;
      refId?: string;
    }>;
  }>({
    userId,
    feature: 'narrative_events',
    systemPrompt: LIFE_EVENTS_SYSTEM_PROMPT,
    userPrompt: JSON.stringify(llmInput, null, 2),
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data || !result.data.lifeEvents?.length) {
    console.warn('[Narrative] No life events extracted');
    return;
  }

  const { lifeEvents } = result.data;

  // Insert life events
  const rows = lifeEvents.map((e) => ({
    user_id: dbUserId,
    occurred_at: e.occurredAt,
    kind: e.kind,
    source: e.source,
    title: e.title,
    summary: e.summary ?? null,
    impact: e.impact,
    emotional_valence: e.emotionalValence ?? null,
    tags: e.tags ?? [],
    ref_type: e.refType ?? null,
    ref_id: e.refId ?? null,
  }));

  const { error: insertError } = await supabaseAdmin
    .from('life_events')
    .insert(rows);

  if (insertError) {
    console.error('[Narrative] Failed to insert life events', insertError);
    throw insertError;
  }
}


