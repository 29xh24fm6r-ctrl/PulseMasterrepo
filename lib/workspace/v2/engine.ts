// Conscious Workspace v2 Engine
// lib/workspace/v2/engine.ts

import { supabaseAdmin } from '@/lib/supabase';
import { buildWorkspaceContext } from './context';
import { callAIJson } from '@/lib/ai/call';
import { getCurrentNarrativeContextForUser } from '@/lib/narrative/context';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const WORKSPACE_V2_SYSTEM_PROMPT = `
You are the Conscious Workspace Engine for a life OS.

You receive:
- Full context: emotion, energy, narrative chapter, social graph, wisdom, ethics signals.
- Yesterday's workspace (state + active threads).

Your job for TODAY:
1. Decide a focusMode and focusTheme.
2. Decide 3–9 key threads for conscious attention, mixing:
   - carried-forward unresolved items (if still relevant),
   - new pressures/opportunities (from context, predictions, narrative).
3. For each thread, set:
   - importance, urgency, optional emotionalValence,
   - attentionCostMinutes,
   - carryForward (whether to keep if unresolved),
   - isPinned (if crucial),
   - wisdomTags (links to previous lessons),
   - riskFlags (where ignoring this is dangerous).
4. Identify 2–5 keyTensions (e.g., "Work vs Family," "Rest vs Overdrive") with pressure level.
5. Identify 2–5 keyOpportunities.
6. Provide a short wisdomSummary:
   - "Given how your life usually goes in contexts like this, here is what tends to work best today."
7. Flag ethicalAlert if any important plan trend or pattern conflicts with values.

You are designing TODAY's mental focus, not all tasks in the system.

Return JSON: { "blueprint": { ... } }.

Only return valid JSON.`;

export async function buildDailyWorkspaceV2ForUser(userId: string, date: Date) {
  const day = date.toISOString().slice(0, 10);
  const dbUserId = await resolveUserId(userId);

  const context = await buildWorkspaceContext(userId, date);
  const narrative = await getCurrentNarrativeContextForUser(userId).catch(() => null);

  // Load previous day's workspace threads to carry-forward unresolved ones
  const { data: prevStateRows } = await supabaseAdmin
    .from('workspace_state')
    .select('*')
    .eq('user_id', dbUserId)
    .lt('state_date', day)
    .order('state_date', { ascending: false })
    .limit(1);

  const prevState = prevStateRows?.[0] ?? null;

  const { data: prevThreads } = prevState
    ? await supabaseAdmin
        .from('workspace_threads')
        .select('*')
        .eq('user_id', dbUserId)
        .eq('status', 'active')
        .in('id', prevState.active_thread_ids || [])
    : { data: [] };

  // Get behavior predictions for context
  const { data: behaviorPredictions } = await supabaseAdmin
    .from('behavior_predictions')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('entity_type', 'self')
    .gte('prediction_time', new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .limit(10)
    .catch(() => ({ data: [] }));

  const result = await callAIJson<{
    blueprint: {
      focusMode: string;
      focusTheme?: string;
      attentionBudgetMinutes: number;
      threads: Array<{
        kind: string;
        title: string;
        summary?: string;
        importance: number;
        urgency: number;
        emotionalValence?: number;
        attentionCostMinutes?: number;
        carryForward?: boolean;
        isPinned?: boolean;
        wisdomTags?: string[];
        riskFlags?: Array<{ label: string; severity: number; details?: string }>;
      }>;
      keyTensions: Array<{ label: string; pressure: number; details?: string }>;
      keyOpportunities: Array<{ label: string; attractiveness: number; details?: string }>;
      wisdomSummary?: string;
      ethicalAlert?: boolean;
      ethicalNotes?: string;
    };
  }>({
    userId,
    feature: 'workspace_v2',
    systemPrompt: WORKSPACE_V2_SYSTEM_PROMPT,
    userPrompt: JSON.stringify({
      date: day,
      context,
      narrative: narrative ? {
        chapter: narrative.chapter?.title,
        themes: narrative.themes || [],
        arcs: narrative.arcs || [],
      } : null,
      behaviorPredictions: (behaviorPredictions || []).slice(0, 5),
      previousWorkspace: {
        state: prevState ? {
          focusMode: prevState.focus_mode,
          focusTheme: prevState.focus_theme,
          keyTensions: prevState.key_tensions || [],
          keyOpportunities: prevState.key_opportunities || [],
        } : null,
        threads: (prevThreads || []).map((t: any) => ({
          id: t.id,
          kind: t.kind,
          title: t.title,
          summary: t.summary,
          importance: t.importance,
          urgency: t.urgency,
          carryForward: t.carry_forward,
          isPinned: t.is_pinned,
        })),
      },
    }, null, 2),
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Workspace v2] Failed to generate blueprint', result.error);
    throw new Error('Failed to generate workspace blueprint');
  }

  const { blueprint } = result.data;

  // Insert new threads
  const threadRows = blueprint.threads.map((t) => ({
    user_id: dbUserId,
    kind: t.kind,
    source: 'workspace_v2',
    ref_type: null,
    ref_id: null,
    title: t.title,
    summary: t.summary ?? null,
    importance: t.importance,
    urgency: t.urgency,
    emotional_valence: t.emotionalValence ?? null,
    attention_cost_minutes: t.attentionCostMinutes ?? null,
    status: 'active',
    snooze_until: null,
    is_pinned: t.isPinned ?? false,
    carry_forward: t.carryForward ?? true,
    wisdom_tags: t.wisdomTags ?? [],
    risk_flags: t.riskFlags ?? [],
  }));

  const { data: insertedThreads, error: insertError } = await supabaseAdmin
    .from('workspace_threads')
    .insert(threadRows)
    .select('id');

  if (insertError) {
    console.error('[Workspace v2] Failed to insert threads', insertError);
    throw insertError;
  }

  const activeThreadIds = insertedThreads.map((r: any) => r.id);

  // Upsert workspace_state
  const { error: upsertError } = await supabaseAdmin
    .from('workspace_state')
    .upsert(
      {
        user_id: dbUserId,
        state_date: day,
        focus_mode: blueprint.focusMode,
        focus_theme: blueprint.focusTheme ?? null,
        active_thread_ids: activeThreadIds,
        attention_budget_minutes: blueprint.attentionBudgetMinutes,
        attention_load: null, // can be computed later
        narrative_chapter_id: narrative?.chapter?.id ?? null,
        narrative_logline: narrative?.snapshot?.short_logline ?? null,
        key_tensions: blueprint.keyTensions ?? [],
        key_opportunities: blueprint.keyOpportunities ?? [],
        wisdom_summary: blueprint.wisdomSummary ?? null,
        ethical_alert: blueprint.ethicalAlert ?? false,
        ethical_notes: blueprint.ethicalNotes ?? null,
      },
      { onConflict: 'user_id,state_date' }
    );

  if (upsertError) {
    console.error('[Workspace v2] Failed to upsert workspace state', upsertError);
    throw upsertError;
  }

  return { stateDate: day, activeThreadIds };
}


