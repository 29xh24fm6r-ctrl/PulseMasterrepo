// Self Behavior Prediction
// lib/behavior/self.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { BehaviorPrediction } from './types';
import { getEmotionSnapshotForUser } from '@/lib/emotion/engine';
import { getSomaticSnapshotForUser } from '@/lib/somatic/engine';
import { getCurrentNarrativeContextForUser } from '@/lib/narrative/context';
import { getWorkCortexContextForUser } from '@/lib/cortex/context';
import { getDailyPlanForUser } from '@/lib/workspace/helpers';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const SELF_BEHAVIOR_PREDICTION_SYSTEM_PROMPT = `
You are the Behavioral Prediction Engine for the user.

You see:
- The user's desire profile (what they truly want and avoid).
- Emotional state for today.
- Somatic state (energy, fatigue).
- Narrative context (current chapter, arcs, tensions).
- Work cortex context (patterns, signals).
- Today's plan (goals, tasks, focus blocks).
- A list of candidate targets to predict behavior on (goals, tasks, habits).

Your job:
1. For each target, estimate the probability (0–1) of specific outcomes, such as:
   - 'will_complete_today'
   - 'will_defer'
   - 'likely_to_procrastinate'
   - 'at_risk_of_drop'
2. Use the desire profile + energy + story context to make realistic predictions.
3. For high-risk items (things that matter but are likely to be skipped), propose gentle, value-aligned interventions:
   - reduce scope, move timing, ask for help, add reminder, coach nudge.

Do NOT suggest manipulative tactics. Keep everything aligned with user's stated values and long-term arcs.

Return JSON:
{ "predictions": [ ... ] }.

Only return valid JSON.`;

async function getPredictionTargetsForSelf(userId: string, date: Date): Promise<any[]> {
  const dbUserId = await resolveUserId(userId);
  const dateStr = date.toISOString().slice(0, 10);

  const targets: any[] = [];

  // Get today's tasks
  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('id, title, due_date, status, priority')
    .eq('user_id', dbUserId)
    .eq('due_date', dateStr)
    .in('status', ['pending', 'in_progress'])
    .limit(10);

  if (tasks) {
    targets.push(...tasks.map((t: any) => ({
      type: 'task',
      id: t.id,
      title: t.title,
      priority: t.priority,
    })));
  }

  // Get active goals
  const { data: goals } = await supabaseAdmin
    .from('goals')
    .select('id, title, status')
    .eq('user_id', dbUserId)
    .in('status', ['active', 'in_progress'])
    .limit(5);

  if (goals) {
    targets.push(...goals.map((g: any) => ({
      type: 'goal',
      id: g.id,
      title: g.title,
    })));
  }

  return targets;
}

export async function refreshSelfBehaviorPredictionsForUser(userId: string, date: Date) {
  const dbUserId = await resolveUserId(userId);
  const day = date.toISOString().slice(0, 10);

  // 1. Load desire profile (self)
  const { data: desireRows } = await supabaseAdmin
    .from('desire_profiles')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('entity_type', 'self')
    .eq('entity_id', dbUserId)
    .limit(1);

  const desireProfile = desireRows?.[0] ?? null;

  // 2. Load context
  const [emotion, somatic, narrative, cortex, plan] = await Promise.all([
    getEmotionSnapshotForUser(userId, date).catch(() => null),
    getSomaticSnapshotForUser(userId, date).catch(() => null),
    getCurrentNarrativeContextForUser(userId).catch(() => null),
    getWorkCortexContextForUser(userId).catch(() => null),
    getDailyPlanForUser(userId, date).catch(() => null),
  ]);

  // 3. Identify prediction targets
  const targets = await getPredictionTargetsForSelf(userId, date);

  if (targets.length === 0) {
    return; // No targets to predict
  }

  const result = await callAIJson<{
    predictions: Array<{
      targetType: string;
      targetId?: string;
      horizon: string;
      outcomeLabel: string;
      probability: number;
      reasoningSummary?: string;
      recommendedIntervention?: any;
    }>;
  }>({
    userId,
    feature: 'behavior_prediction_self',
    systemPrompt: SELF_BEHAVIOR_PREDICTION_SYSTEM_PROMPT,
    userPrompt: JSON.stringify({
      date: day,
      desireProfile: desireProfile ? {
        summary: desireProfile.summary,
        priorities: desireProfile.priorities,
        avoidanceTriggers: desireProfile.avoidance_triggers,
        longTermDesires: desireProfile.long_term_desires,
      } : null,
      emotion,
      somatic,
      narrative: narrative ? {
        chapter: narrative.chapter?.title,
        tensions: narrative.snapshot?.tensions || [],
        activeArcs: narrative.arcs.map((a: any) => a.name),
      } : null,
      cortex: cortex ? {
        recentSignals: cortex.recentSignals?.slice(0, 5) || [],
        patterns: cortex.strongestPatterns?.slice(0, 3) || [],
      } : null,
      plan,
      targets,
    }, null, 2),
    maxTokens: 2500,
    temperature: 0.7,
  });

  if (!result.success || !result.data || !result.data.predictions?.length) {
    console.warn('[Behavior] No self predictions generated');
    return;
  }

  const { predictions } = result.data;

  // Clear old predictions for today
  await supabaseAdmin
    .from('behavior_predictions')
    .delete()
    .eq('user_id', dbUserId)
    .eq('entity_type', 'self')
    .eq('entity_id', dbUserId)
    .eq('horizon', 'today');

  const rows = predictions.map((p) => ({
    user_id: dbUserId,
    entity_type: 'self',
    entity_id: dbUserId,
    target_type: p.targetType,
    target_id: p.targetId ?? null,
    horizon: p.horizon || 'today',
    outcome_label: p.outcomeLabel,
    probability: p.probability,
    reasoning_summary: p.reasoningSummary ?? null,
    features_used: {},
    recommended_intervention: p.recommendedIntervention ?? {},
  }));

  const { error } = await supabaseAdmin
    .from('behavior_predictions')
    .insert(rows);

  if (error) {
    console.error('[Behavior] Failed to insert self predictions', error);
    throw error;
  }
}


