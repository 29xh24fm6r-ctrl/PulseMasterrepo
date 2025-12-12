// Global Conscious Workspace Engine
// lib/workspace/engine.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { WorkspaceState, WorkspaceThread, FocusMode } from './types';
import { getDailyPlanForUser, getEmotionSnapshotForWorkspace, getSomaticSnapshotForWorkspace, getCortexContextForWorkspace } from './helpers';
import { getCurrentNarrativeContextForUser } from '@/lib/narrative/context';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const WORKSPACE_BUILD_SYSTEM_PROMPT = `
You are the Global Conscious Workspace for a user's life operating system.

You receive:
- Today's date
- A daily plan (top goals, focus items, constraints)
- Work cortex context (signals, patterns, predictions)
- Emotion snapshot (stress, mood, valence, arousal)
- Somatic snapshot (sleep, energy score, fatigue risk)
- Narrative context (current chapter, themes, identity arcs, tensions)

Your job:
1. Choose a focus mode: 'normal', 'deep_work', 'recovery', or 'fire_fighting'.
   - If energy_score is low (<0.5) or fatigue_risk is high (>0.6), recommend 'recovery' mode.
   - If stress_score is very high (>0.8), consider 'fire_fighting' mode.
2. Choose a focus theme (e.g., "Close deals and clear blockers").
   - Consider the current life chapter and active themes when choosing the theme.
   - Favor plans and threads that move identity arcs forward and resolve current tensions.
3. Select 3–7 threads that should be in active consciousness today.
   Each thread should have:
   - kind (e.g., 'deal', 'project', 'relationship', 'problem', 'insight')
   - source (e.g., 'prefrontal', 'cortex', 'emotion', 'narrative')
   - refType and refId when applicable (deal id, task id, contact id)
   - a short title and 1–2 sentence summary
   - importance (0–1) and urgency (0–1)
   - emotionalValence (-1 to 1) if applicable
   - attentionCostMinutes (how much focused time it needs)
4. Estimate today's attentionBudgetMinutes given constraints and energy.
   - If energy_score is low, reduce attentionBudgetMinutes (e.g., 300 instead of 480).
   - If fatigue_risk is high, reduce further.

Return JSON: { "workspace": { "focusMode": "...", "focusTheme": "...", "threads": [...], "attentionBudgetMinutes": 480 } }.

Only return valid JSON.`;

export async function buildDailyWorkspaceForUser(userId: string, date: Date) {
  const dbUserId = await resolveUserId(userId);
  const stateDate = date.toISOString().slice(0, 10);

  // 1. Gather context
  const [plan, cortexContext, emotion, somatic, narrative] = await Promise.all([
    getDailyPlanForUser(userId, date),
    getCortexContextForWorkspace(userId, date),
    getEmotionSnapshotForWorkspace(userId, date),
    getSomaticSnapshotForWorkspace(userId, date),
    getCurrentNarrativeContextForUser(userId).catch(() => null), // Optional, don't fail if missing
  ]);

  // 2. Call LLM to determine focus mode, theme, and initial threads
  const result = await callAIJson<{
    workspace: {
      focusMode: FocusMode;
      focusTheme: string;
      threads: Array<{
        kind: string;
        source: string;
        refType?: string;
        refId?: string;
        title: string;
        summary?: string;
        importance: number;
        urgency: number;
        emotionalValence?: number;
        attentionCostMinutes?: number;
      }>;
      attentionBudgetMinutes: number;
    };
  }>({
    userId,
    feature: 'workspace_build',
    systemPrompt: WORKSPACE_BUILD_SYSTEM_PROMPT,
    userPrompt: JSON.stringify({
      date: stateDate,
      dailyPlan: plan,
      cortexContext: {
        recentSignals: cortexContext.recentSignals?.slice(0, 5) || [],
        strongestPatterns: cortexContext.strongestPatterns?.slice(0, 3) || [],
        latestPredictions: cortexContext.latestPredictions?.slice(0, 3) || [],
        recentAnomalies: cortexContext.recentAnomalies?.slice(0, 2) || [],
      },
      emotion,
      somatic,
      narrative: narrative ? {
        chapter: narrative.chapter ? {
          title: narrative.chapter.title,
          tagline: narrative.chapter.tagline,
          dominantThemes: narrative.chapter.dominant_themes,
          primaryRoles: narrative.chapter.primary_roles,
        } : null,
        activeThemes: narrative.themes.slice(0, 5).map((t: any) => ({
          key: t.key,
          name: t.name,
          strength: t.strength,
        })),
        activeArcs: narrative.arcs.slice(0, 3).map((a: any) => ({
          key: a.key,
          name: a.name,
          progress: a.progress,
        })),
        tensions: narrative.snapshot?.tensions || [],
      } : null,
    }, null, 2),
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Workspace] Failed to build workspace', result.error);
    // Fallback to basic workspace
    const fallbackThreads = [
      {
        kind: 'task',
        source: 'prefrontal',
        title: 'Complete today\'s tasks',
        summary: 'Focus on completing planned tasks for today',
        importance: 0.7,
        urgency: 0.6,
      },
    ];

    const { data: threadRows } = await supabaseAdmin
      .from('workspace_threads')
      .insert(
        fallbackThreads.map((t) => ({
          user_id: dbUserId,
          kind: t.kind,
          source: t.source,
          title: t.title,
          summary: t.summary,
          importance: t.importance,
          urgency: t.urgency,
          status: 'active',
        }))
      )
      .select('id');

    const activeThreadIds = threadRows?.map((r: any) => r.id) || [];

    await supabaseAdmin
      .from('workspace_state')
      .upsert({
        user_id: dbUserId,
        state_date: stateDate,
        focus_mode: 'normal',
        focus_theme: 'Complete today\'s tasks',
        active_thread_ids: activeThreadIds,
        attention_budget_minutes: 480,
        attention_load: Math.min(1, activeThreadIds.length / 7),
        last_updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,state_date' });

    return;
  }

  const { workspace } = result.data;

  // 3. Insert / upsert threads
  const { data: threadRows, error: threadError } = await supabaseAdmin
    .from('workspace_threads')
    .insert(
      workspace.threads.map((t) => ({
        user_id: dbUserId,
        kind: t.kind,
        source: t.source ?? 'prefrontal',
        ref_type: t.refType ?? null,
        ref_id: t.refId ?? null,
        title: t.title,
        summary: t.summary ?? null,
        importance: t.importance,
        urgency: t.urgency,
        emotional_valence: t.emotionalValence ?? null,
        attention_cost_minutes: t.attentionCostMinutes ?? null,
        status: 'active',
      }))
    )
    .select('id');

  if (threadError) {
    console.error('[Workspace] Failed to insert threads', threadError);
    throw threadError;
  }

  const activeThreadIds = threadRows?.map((r: any) => r.id) || [];

  // 4. Upsert workspace_state
  const { error: stateError } = await supabaseAdmin
    .from('workspace_state')
    .upsert(
      {
        user_id: dbUserId,
        state_date: stateDate,
        focus_mode: workspace.focusMode,
        focus_theme: workspace.focusTheme,
        active_thread_ids: activeThreadIds,
        attention_budget_minutes: workspace.attentionBudgetMinutes,
        attention_load: Math.min(1, activeThreadIds.length / 7),
        last_updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,state_date' }
    );

  if (stateError) {
    console.error('[Workspace] Failed to upsert state', stateError);
    throw stateError;
  }
}

