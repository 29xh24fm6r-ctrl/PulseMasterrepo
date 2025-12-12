// Destiny Alignment Evaluator
// lib/destiny/alignment.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { DestinyAlignmentSnapshot } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const DESTINY_ALIGNMENT_PROMPT = `
You are the Destiny Alignment Evaluator.

You see:
- The current Destiny Arc (6–24 month story).
- Destiny checkpoints.
- Today's workspace (what is actually in focus).
- Somatic metrics (body state).
- Latest narrative snapshot.
- Experience events for the last 7 days.

Your job:
1. Evaluate alignmentOverall (0..1): how well current life is tracking toward this Destiny Arc.
2. Evaluate alignmentByDomain per major domain.
3. Evaluate narrativeConsistency (0..1): does the current chapter feel on-arc or off-arc?
4. Identify tensionNotes:
   - where actual behavior conflicts with destiny, especially in high-importance areas.
5. Suggest 2–7 courseCorrectionSuggestions:
   - small, realistic shifts to bring life back on-arc.

Return JSON: { "snapshot": { ... } }.

Only return valid JSON.`;

export async function evaluateDestinyAlignmentForUser(userId: string, date: Date) {
  const day = date.toISOString().slice(0, 10);
  const dbUserId = await resolveUserId(userId);

  const [{ data: arcs }, { data: checkpoints }, workspaceRes, metricsRes, narrativeRes, experiencesRes] =
    await Promise.all([
      supabaseAdmin
        .from('destiny_arcs')
        .select('*')
        .eq('user_id', dbUserId)
        .eq('is_current', true)
        .limit(1),
      supabaseAdmin
        .from('destiny_checkpoints')
        .select('*')
        .eq('user_id', dbUserId)
        .order('target_date', { ascending: true }),
      supabaseAdmin
        .from('workspace_state')
        .select('*')
        .eq('user_id', dbUserId)
        .eq('state_date', day)
        .limit(1),
      supabaseAdmin
        .from('somatic_daily_metrics')
        .select('*')
        .eq('user_id', dbUserId)
        .eq('metrics_date', day)
        .limit(1),
      supabaseAdmin
        .from('narrative_snapshots')
        .select('*')
        .eq('user_id', dbUserId)
        .order('snapshot_at', { ascending: false })
        .limit(1),
      supabaseAdmin
        .from('experience_events')
        .select('*')
        .eq('user_id', dbUserId)
        .gte('occurred_at', new Date(Date.now() - 7 * 86400000).toISOString())
        .order('occurred_at', { ascending: false })
        .limit(30),
    ]);

  const arc = arcs?.[0] ?? null;
  if (!arc) {
    console.warn('[Destiny] No current arc found for alignment evaluation');
    return;
  }

  const workspaceState = workspaceRes?.[0] ?? null;
  const somatic = metricsRes?.[0] ?? null;
  const narrative = narrativeRes?.[0] ?? null;

  const result = await callAIJson<{ snapshot: DestinyAlignmentSnapshot }>({
    userId,
    feature: 'destiny_alignment',
    systemPrompt: DESTINY_ALIGNMENT_PROMPT,
    userPrompt: JSON.stringify({
      date: day,
      arc: {
        name: arc.name,
        logline: arc.logline,
        arcStart: arc.arc_start,
        arcEnd: arc.arc_end,
        focusDomains: arc.focus_domains,
        guidingPrinciples: arc.guiding_principles,
      },
      checkpoints: (checkpoints || []).map((c: any) => ({
        label: c.label,
        description: c.description,
        domain: c.domain,
        targetDate: c.target_date,
        importance: c.importance,
        status: c.status,
      })),
      workspaceState: workspaceState ? {
        focusMode: workspaceState.focus_mode,
        focusTheme: workspaceState.focus_theme,
        keyTensions: workspaceState.key_tensions || [],
        keyOpportunities: workspaceState.key_opportunities || [],
      } : null,
      somatic: somatic ? {
        recoveryScore: somatic.recovery_score,
        fatigueScore: somatic.fatigue_score,
        stressLoadScore: somatic.stress_load_score,
      } : null,
      narrative: narrative ? {
        shortLogline: narrative.short_logline,
        tensions: narrative.tensions || [],
        opportunities: narrative.opportunities || [],
      } : null,
      experiences: (experiencesRes.data || []).slice(0, 20).map((e: any) => ({
        source: e.source,
        kind: e.kind,
        description: e.description,
        evaluation: e.evaluation || {},
      })),
    }, null, 2),
    maxTokens: 2500,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Destiny] Failed to generate alignment snapshot', result.error);
    return;
  }

  const { snapshot } = result.data;

  const { error } = await supabaseAdmin
    .from('destiny_alignment_log')
    .insert({
      user_id: dbUserId,
      arc_id: arc.id,
      alignment_overall: snapshot.alignmentOverall,
      alignment_by_domain: snapshot.alignmentByDomain ?? {},
      narrative_consistency: snapshot.narrativeConsistency ?? null,
      tension_notes: snapshot.tensionNotes ?? {},
      course_correction_suggestions: snapshot.courseCorrectionSuggestions ?? {},
    });

  if (error) {
    console.error('[Destiny] Failed to save alignment log', error);
    throw error;
  }
}


