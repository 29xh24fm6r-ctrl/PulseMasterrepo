// Inner Monologue Engine
// lib/monologue/engine.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { buildWorkspaceContext } from '@/lib/workspace/v2/context';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const INNER_MONOLOGUE_DAILY_SYSTEM_PROMPT = `
You are the Inner Monologue of the Pulse Brain.

You will produce a short sequence of internal "thoughts" about the user's current situation.

You receive:
- Today's workspace (threads, tensions, opportunities).
- Context: emotion, energy, narrative, social, wisdom, ethics.
- Recent experiences and outcomes.

Your job:
1. Generate 3–12 inner_monologue entries of different kinds:
   - 'observation': "I'm noticing X..."
   - 'question': "I wonder why Y keeps happening..."
   - 'hypothesis': "Maybe when Z, the best approach is..."
   - 'worry': "If this continues, risk is..."
   - 'plan': "Next time this happens, we should..."
   - 'meta': "As the system, I'm learning that..."

2. Keep each entry short (1–3 sentences).

3. Link entries to relevant workspace threads when appropriate.

4. Focus on things that matter long-term:
   - recurring issues,
   - patterns in energy or relationship tension,
   - mismatches between values and behavior,
   - opportunities aligned with identity arcs.

These entries are NOT shown directly to the user. They are used to generate insights and improve future decisions.

Return JSON: { "entries": [ ... ] }.

Only return valid JSON.`;

async function getLatestWorkspaceForUser(userId: string, date: Date): Promise<any> {
  const dbUserId = await resolveUserId(userId);
  const day = date.toISOString().slice(0, 10);

  const { data: stateRows } = await supabaseAdmin
    .from('workspace_state')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('state_date', day)
    .limit(1);

  const state = stateRows?.[0] ?? null;

  if (!state) return null;

  const { data: threads } = await supabaseAdmin
    .from('workspace_threads')
    .select('*')
    .eq('user_id', dbUserId)
    .in('id', state.active_thread_ids || []);

  return {
    state,
    threads: threads || [],
  };
}

async function getRecentExperienceEventsForUser(userId: string, date: Date, days: number): Promise<any[]> {
  const dbUserId = await resolveUserId(userId);
  const since = new Date(date);
  since.setDate(since.getDate() - days);

  const { data } = await supabaseAdmin
    .from('experience_events')
    .select('*')
    .eq('user_id', dbUserId)
    .gte('occurred_at', since.toISOString())
    .order('occurred_at', { ascending: false })
    .limit(20);

  return data || [];
}

export async function generateDailyInnerMonologue(userId: string, date: Date, source: string) {
  const day = date.toISOString().slice(0, 10);
  const dbUserId = await resolveUserId(userId);

  const workspace = await getLatestWorkspaceForUser(userId, date);
  const context = await buildWorkspaceContext(userId, date);
  const recentExperiences = await getRecentExperienceEventsForUser(userId, date, 3);

  const result = await callAIJson<{
    entries: Array<{
      kind: string;
      importance: number;
      content: string;
      threadIds?: string[];
      annotations?: any;
    }>;
  }>({
    userId,
    feature: 'inner_monologue',
    systemPrompt: INNER_MONOLOGUE_DAILY_SYSTEM_PROMPT,
    userPrompt: JSON.stringify({
      date: day,
      workspace: workspace ? {
        state: {
          focusMode: workspace.state.focus_mode,
          focusTheme: workspace.state.focus_theme,
          keyTensions: workspace.state.key_tensions || [],
          keyOpportunities: workspace.state.key_opportunities || [],
        },
        threads: workspace.threads.map((t: any) => ({
          id: t.id,
          title: t.title,
          summary: t.summary,
          importance: t.importance,
          urgency: t.urgency,
        })),
      } : null,
      context,
      recentExperiences: recentExperiences.slice(0, 10).map((e: any) => ({
        source: e.source,
        kind: e.kind,
        description: e.description,
        evaluation: e.evaluation || {},
      })),
    }, null, 2),
    maxTokens: 2500,
    temperature: 0.8, // Slightly higher for more creative/exploratory thoughts
  });

  if (!result.success || !result.data || !result.data.entries?.length) {
    console.warn('[Monologue] No entries generated');
    return;
  }

  const { entries } = result.data;

  const rows = entries.map((e) => ({
    user_id: dbUserId,
    source,
    state_date: day,
    kind: e.kind,
    importance: e.importance,
    content: e.content,
    thread_ids: e.threadIds || [],
    annotations: e.annotations || {},
  }));

  const { error } = await supabaseAdmin
    .from('inner_monologue_entries')
    .insert(rows);

  if (error) {
    console.error('[Monologue] Failed to insert entries', error);
    throw error;
  }
}


