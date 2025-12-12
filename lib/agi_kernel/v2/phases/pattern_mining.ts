// AGI Kernel v2 - Pattern Mining Phase
// lib/agi_kernel/v2/phases/pattern_mining.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { PhaseResult } from '../types';
import { AGI_PATTERN_MINING_PROMPT } from '../prompts';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function runPatternMiningPhase(args: {
  userId: string;
  runId: string;
  ctx: any;
  brainContext: any;
}): Promise<PhaseResult> {
  const { userId, runId, brainContext } = args;
  const dbUserId = await resolveUserId(userId);

  const result = await callAIJson<{
    patterns: {
      crossDomainPatterns: any[];
      anomalies: any[];
      overallConfidence: number;
    };
  }>({
    userId,
    feature: 'agi_kernel_pattern_mining',
    systemPrompt: AGI_PATTERN_MINING_PROMPT,
    userPrompt: JSON.stringify(brainContext, null, 2),
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[AGI Kernel] Pattern mining phase failed', result.error);
    return {
      status: 'failed',
      errorSummary: result.error ?? 'Failed to generate pattern mining',
    };
  }

  const { patterns } = result.data;

  const rows: any[] = [];

  for (const p of patterns.crossDomainPatterns ?? []) {
    rows.push({
      run_id: runId,
      user_id: dbUserId,
      source_phase: 'pattern_mining',
      category: 'pattern',
      label: p.label,
      description: p.description,
      importance: p.importance ?? 0.7,
      confidence: p.confidence ?? 0.7,
      scope: p.scope ?? 'meta',
      related_entities: p.relatedEntities ?? {},
      recommended_actions: p.recommendedActions ?? {},
    });
  }

  for (const a of patterns.anomalies ?? []) {
    rows.push({
      run_id: runId,
      user_id: dbUserId,
      source_phase: 'pattern_mining',
      category: 'anomaly',
      label: a.label,
      description: a.description,
      importance: a.importance ?? 0.6,
      confidence: a.confidence ?? 0.6,
      scope: a.scope ?? 'meta',
      related_entities: a.relatedEntities ?? {},
      recommended_actions: a.recommendedActions ?? {},
    });
  }

  if (rows.length) {
    const { error } = await supabaseAdmin
      .from('cognitive_insights')
      .insert(rows);
    if (error) throw error;
  }

  return {
    status: 'completed',
    data: {
      overallConfidence: patterns?.overallConfidence ?? 0.8,
    },
  };
}


