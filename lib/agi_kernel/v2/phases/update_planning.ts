// AGI Kernel v2 - Update Planning Phase
// lib/agi_kernel/v2/phases/update_planning.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { PhaseResult } from '../types';
import { AGI_UPDATE_PLANNING_PROMPT } from '../prompts';
import { evaluateUpdateSafety } from '../safety';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function runUpdatePlanningPhase(args: {
  userId: string;
  runId: string;
  ctx: any;
  brainContext: any;
}): Promise<PhaseResult> {
  const { userId, runId } = args;
  const dbUserId = await resolveUserId(userId);

  // Pull fresh insights & hypotheses for this run
  const [{ data: insights }, { data: hypotheses }] = await Promise.all([
    supabaseAdmin
      .from('cognitive_insights')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('run_id', runId),
    supabaseAdmin
      .from('cognitive_hypotheses')
      .select('*')
      .eq('user_id', dbUserId),
  ]);

  const result = await callAIJson<{
    plan: {
      updates: Array<{
        targetSystem: string;
        actionKind: string;
        payload: any;
        importance: number;
        confidence: number;
      }>;
      overallConfidence: number;
    };
  }>({
    userId,
    feature: 'agi_kernel_update_planning',
    systemPrompt: AGI_UPDATE_PLANNING_PROMPT,
    userPrompt: JSON.stringify({
      insights: insights ?? [],
      hypotheses: hypotheses ?? [],
    }, null, 2),
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[AGI Kernel] Update planning phase failed', result.error);
    return {
      status: 'failed',
      errorSummary: result.error ?? 'Failed to generate update planning',
    };
  }

  const { plan } = result.data;

  const rows: any[] = [];
  for (const u of plan.updates ?? []) {
    const evaluation = evaluateUpdateSafety(u.targetSystem, u.actionKind, u.payload);

    rows.push({
      run_id: runId,
      user_id: dbUserId,
      target_system: u.targetSystem,
      action_kind: u.actionKind,
      payload: u.payload,
      autonomy_level: evaluation.autonomyLevel,
      importance: u.importance ?? 0.6,
      confidence: u.confidence ?? 0.7,
      safety_risk: evaluation.safetyRisk,
      status: 'pending',
      status_details: { safetyNotes: evaluation.notes ?? [] },
    });
  }

  if (rows.length) {
    const { error } = await supabaseAdmin
      .from('cognitive_update_actions')
      .insert(rows);
    if (error) throw error;
  }

  return {
    status: 'completed',
    data: {
      overallConfidence: plan?.overallConfidence ?? 0.75,
      updateCount: rows.length,
    },
  };
}


