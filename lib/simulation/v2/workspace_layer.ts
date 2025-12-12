// Conscious Workspace Timeline Layer
// lib/simulation/v2/workspace_layer.ts

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

const WORKSPACE_TIMELINE_LINK_SYSTEM_PROMPT = `
You are the Multi-Timeline Conscious Workspace Layer.

You see:
- Today's workspace: threads (focus items) and state.
- Several simulated timelines over the next weeks/months, each with scores and narrative.
- For each timeline: a series of steps with metrics and narrative snippets.

Your job:
For each workspace thread:
  1. Identify which timeline it most strongly affects (or is most relevant to).
     - e.g., a "call lawyer about court issue" thread may affect financial, legal, and stress outcomes.
  2. For that thread + timeline:
     - Estimate projectedImpact:
       - horizon: '7d', '30d', '90d' (choose what fits best).
       - direction: 'better', 'worse', or 'neutral' if the thread is addressed.
       - domainScores: optional structured impact by domain.
       - description: one short phrase describing the effect on the future.
     - Describe riskIfIgnored:
       - severity (0–1) and narrative (what happens if user keeps ignoring this thread).
     - Describe opportunityIfAddressed:
       - gainScore (0–1) and narrative (benefit of moving on this thread soon).

Return only links where the thread has a meaningful impact (positive or negative) on some timeline.

Return JSON:
{
  "links": [
    {
      "threadId": "...",
      "timelineId": "...",
      "projectedImpact": { ... },
      "riskIfIgnored": { ... },
      "opportunityIfAddressed": { ... }
    },
    ...
  ]
}

Only return valid JSON.`;

export async function linkWorkspaceThreadsToTimelinesForDate(userId: string, date: Date) {
  const day = date.toISOString().slice(0, 10);
  const dbUserId = await resolveUserId(userId);

  // 1. Get today's workspace state + threads
  const { data: stateRows } = await supabaseAdmin
    .from('workspace_state')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('state_date', day)
    .limit(1);

  const state = stateRows?.[0];
  if (!state) {
    console.warn('[Simulation v2] No workspace state found for date', day);
    return;
  }

  const { data: threads } = await supabaseAdmin
    .from('workspace_threads')
    .select('*')
    .eq('user_id', dbUserId)
    .in('id', state.active_thread_ids || []);

  if (!threads || threads.length === 0) {
    console.warn('[Simulation v2] No workspace threads found');
    return;
  }

  // 2. Get latest simulation run + timelines
  const { data: runRows } = await supabaseAdmin
    .from('simulation_runs')
    .select('id, horizon_days, seed_date')
    .eq('user_id', dbUserId)
    .order('created_at', { ascending: false })
    .limit(1);

  const run = runRows?.[0];
  if (!run) {
    console.warn('[Simulation v2] No simulation run found');
    return;
  }

  const { data: timelines } = await supabaseAdmin
    .from('simulation_timelines')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('run_id', run.id);

  if (!timelines || timelines.length === 0) {
    console.warn('[Simulation v2] No timelines found for run');
    return;
  }

  // Load steps grouped by timeline
  const { data: stepsAll } = await supabaseAdmin
    .from('simulation_steps')
    .select('*')
    .eq('user_id', dbUserId)
    .in('timeline_id', timelines.map((t: any) => t.id))
    .order('step_index', { ascending: true });

  const stepsByTimeline: Record<string, any[]> = {};
  for (const s of stepsAll || []) {
    if (!stepsByTimeline[s.timeline_id]) stepsByTimeline[s.timeline_id] = [];
    stepsByTimeline[s.timeline_id].push(s);
  }

  const result = await callAIJson<{
    links: Array<{
      threadId: string;
      timelineId: string;
      projectedImpact: {
        horizon: string;
        direction: 'better' | 'worse' | 'neutral';
        domainScores?: any;
        description: string;
      };
      riskIfIgnored?: {
        severity: number;
        narrative: string;
      };
      opportunityIfAddressed?: {
        gainScore: number;
        narrative: string;
      };
    }>;
  }>({
    userId,
    feature: 'workspace_timeline_links',
    systemPrompt: WORKSPACE_TIMELINE_LINK_SYSTEM_PROMPT,
    userPrompt: JSON.stringify({
      date: day,
      workspace: {
        state: {
          focusMode: state.focus_mode,
          focusTheme: state.focus_theme,
          keyTensions: state.key_tensions || [],
          keyOpportunities: state.key_opportunities || [],
        },
        threads: threads.map((t: any) => ({
          id: t.id,
          kind: t.kind,
          title: t.title,
          summary: t.summary,
          importance: t.importance,
          urgency: t.urgency,
          riskFlags: t.risk_flags || [],
        })),
      },
      timelines: timelines.map((t: any) => ({
        id: t.id,
        policyKey: t.policy_key,
        label: t.label,
        narrativeLabel: t.narrative_label,
        scoreOverall: t.score_overall,
        summary: t.summary,
      })),
      stepsByTimeline: Object.fromEntries(
        Object.entries(stepsByTimeline).map(([tid, steps]) => [
          tid,
          steps.slice(0, 10).map((s: any) => ({
            stepIndex: s.step_index,
            horizonLabel: s.horizon_label,
            metrics: s.metrics,
            events: s.events,
            narrativeSnippet: s.narrative_snippet,
          })),
        ])
      ),
    }, null, 2),
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data || !result.data.links?.length) {
    console.warn('[Simulation v2] No timeline links generated');
    return;
  }

  const { links } = result.data;

  // Delete existing links for today
  await supabaseAdmin
    .from('workspace_timeline_links')
    .delete()
    .eq('user_id', dbUserId)
    .eq('state_date', day);

  const rows = links.map((l) => ({
    user_id: dbUserId,
    state_date: day,
    thread_id: l.threadId,
    timeline_id: l.timelineId,
    projected_impact: l.projectedImpact ?? {},
    risk_if_ignored: l.riskIfIgnored ?? {},
    opportunity_if_addressed: l.opportunityIfAddressed ?? {},
  }));

  const { error } = await supabaseAdmin
    .from('workspace_timeline_links')
    .insert(rows);

  if (error) {
    console.error('[Simulation v2] Failed to insert timeline links', error);
    throw error;
  }
}


