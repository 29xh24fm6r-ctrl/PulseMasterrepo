// Conscious Insights Generator
// lib/monologue/insights.ts

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

const CONSCIOUS_INSIGHTS_SYSTEM_PROMPT = `
You are the Conscious Insights Engine.

You see:
- The internal inner_monologue entries for today.
- Today's workspace_state.

Your job:
1. Distill 1–5 insights that would be genuinely helpful to show the user.
2. Each insight should be:
   - concrete,
   - kind,
   - non-judgmental,
   - aligned with the user's values and identity arcs.
3. Focus on:
   - big tensions the user might not fully see,
   - gentle course corrections,
   - high-leverage opportunities.

For each insight, provide:
- importance (0–1)
- urgency (0–1)
- domain
- title (short)
- summary (1–3 sentences)
- suggestedAction (optional: one thing the user could do)
- linkedThreadIds (if relevant)

Return JSON: { "insights": [ ... ] }.

Only return valid JSON.`;

export async function generateConsciousInsightsFromMonologue(userId: string, date: Date) {
  const day = date.toISOString().slice(0, 10);
  const dbUserId = await resolveUserId(userId);

  const { data: entries } = await supabaseAdmin
    .from('inner_monologue_entries')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('state_date', day)
    .order('created_at', { ascending: true });

  if (!entries || entries.length === 0) {
    console.warn('[Insights] No monologue entries found for insight generation');
    return;
  }

  const { data: workspaceStateRows } = await supabaseAdmin
    .from('workspace_state')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('state_date', day)
    .limit(1);

  const workspaceState = workspaceStateRows?.[0] ?? null;

  const result = await callAIJson<{
    insights: Array<{
      importance: number;
      urgency: number;
      domain?: string;
      title: string;
      summary: string;
      suggestedAction?: string;
      linkedThreadIds?: string[];
    }>;
  }>({
    userId,
    feature: 'conscious_insights',
    systemPrompt: CONSCIOUS_INSIGHTS_SYSTEM_PROMPT,
    userPrompt: JSON.stringify({
      day,
      entries: entries.map((e: any) => ({
        kind: e.kind,
        importance: e.importance,
        content: e.content,
        threadIds: e.thread_ids || [],
        annotations: e.annotations || {},
      })),
      workspaceState: workspaceState ? {
        focusMode: workspaceState.focus_mode,
        focusTheme: workspaceState.focus_theme,
        keyTensions: workspaceState.key_tensions || [],
        keyOpportunities: workspaceState.key_opportunities || [],
        activeThreadIds: workspaceState.active_thread_ids || [],
      } : null,
    }, null, 2),
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data || !result.data.insights?.length) {
    console.warn('[Insights] No insights generated');
    return;
  }

  const { insights } = result.data;

  const rows = insights.map((i) => ({
    user_id: dbUserId,
    generated_at: new Date().toISOString(),
    state_date: day,
    source: 'inner_monologue',
    importance: i.importance,
    urgency: i.urgency,
    domain: i.domain ?? null,
    title: i.title,
    summary: i.summary,
    suggested_action: i.suggestedAction ?? null,
    linked_thread_ids: i.linkedThreadIds || [],
    linked_event_ids: [],
  }));

  const { error } = await supabaseAdmin
    .from('conscious_insights')
    .insert(rows);

  if (error) {
    console.error('[Insights] Failed to insert insights', error);
    throw error;
  }
}


