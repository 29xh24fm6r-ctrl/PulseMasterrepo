// AGI Kernel v2 - Model Reconciliation Phase
// lib/agi_kernel/v2/phases/model_reconciliation.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { PhaseResult } from '../types';
import { AGI_MODEL_RECONCILIATION_PROMPT } from '../prompts';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

async function upsertHypothesis(userId: string, h: any) {
  const dbUserId = await resolveUserId(userId);

  const { data: existing } = await supabaseAdmin
    .from('cognitive_hypotheses')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('label', h.label)
    .limit(1);

  const base = {
    user_id: dbUserId,
    label: h.label,
    description: h.description ?? '',
    status: h.status ?? 'active',
    evidence_for: h.evidenceFor ?? [],
    evidence_against: h.evidenceAgainst ?? [],
    confidence: h.confidence ?? 0.5,
    last_evaluated_at: new Date().toISOString(),
    tags: h.tags ?? [],
  };

  if (existing?.[0]) {
    await supabaseAdmin
      .from('cognitive_hypotheses')
      .update({
        ...base,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing[0].id);
  } else {
    await supabaseAdmin
      .from('cognitive_hypotheses')
      .insert({
        ...base,
        created_at: new Date().toISOString(),
      });
  }
}

export async function runModelReconciliationPhase(args: {
  userId: string;
  runId: string;
  ctx: any;
  brainContext: any;
}): Promise<PhaseResult> {
  const { userId, runId, brainContext } = args;
  const dbUserId = await resolveUserId(userId);

  const result = await callAIJson<{
    reconciled: {
      conflicts: any[];
      hypotheses: any[];
      overallConfidence: number;
    };
  }>({
    userId,
    feature: 'agi_kernel_model_reconciliation',
    systemPrompt: AGI_MODEL_RECONCILIATION_PROMPT,
    userPrompt: JSON.stringify(brainContext, null, 2),
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[AGI Kernel] Model reconciliation phase failed', result.error);
    return {
      status: 'failed',
      errorSummary: result.error ?? 'Failed to generate model reconciliation',
    };
  }

  const { reconciled } = result.data;

  // Save conflicts as cognitive_insights
  if (reconciled?.conflicts?.length) {
    const rows = reconciled.conflicts.map((c: any) => ({
      run_id: runId,
      user_id: dbUserId,
      source_phase: 'model_reconciliation',
      category: 'alignment',
      label: c.label ?? 'Model conflict',
      description: c.description ?? '',
      importance: c.importance ?? 0.7,
      confidence: c.confidence ?? 0.7,
      scope: c.scope ?? 'meta',
      related_entities: c.relatedEntities ?? {},
      recommended_actions: c.recommendedActions ?? {},
    }));

    const { error } = await supabaseAdmin
      .from('cognitive_insights')
      .insert(rows);
    if (error) throw error;
  }

  // Upsert hypotheses into cognitive_hypotheses
  if (reconciled?.hypotheses?.length) {
    for (const h of reconciled.hypotheses) {
      await upsertHypothesis(userId, h);
    }
  }

  return {
    status: 'completed',
    data: {
      overallConfidence: reconciled?.overallConfidence ?? 0.75,
    },
  };
}


