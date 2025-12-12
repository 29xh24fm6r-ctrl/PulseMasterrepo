// AGI Kernel v2 - Forecasting Phase
// lib/agi_kernel/v2/phases/forecasting.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { PhaseResult } from '../types';
import { AGI_FORECASTING_PROMPT } from '../prompts';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function runForecastingPhase(args: {
  userId: string;
  runId: string;
  ctx: any;
  brainContext: any;
}): Promise<PhaseResult> {
  const { userId, runId, brainContext } = args;
  const dbUserId = await resolveUserId(userId);

  const result = await callAIJson<{
    forecast: {
      upcomingRisks: any[];
      upcomingOpportunities: any[];
      bottlenecks: any[];
      overallConfidence: number;
    };
  }>({
    userId,
    feature: 'agi_kernel_forecasting',
    systemPrompt: AGI_FORECASTING_PROMPT,
    userPrompt: JSON.stringify(brainContext, null, 2),
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[AGI Kernel] Forecasting phase failed', result.error);
    return {
      status: 'failed',
      errorSummary: result.error ?? 'Failed to generate forecasting',
    };
  }

  const { forecast } = result.data;

  const rows: any[] = [];

  for (const r of forecast.upcomingRisks ?? []) {
    rows.push({
      run_id: runId,
      user_id: dbUserId,
      source_phase: 'forecasting',
      category: 'risk',
      label: r.label,
      description: r.description,
      importance: r.importance ?? 0.8,
      confidence: r.confidence ?? 0.7,
      scope: r.scope ?? 'meta',
      related_entities: r.relatedEntities ?? {},
      recommended_actions: r.recommendedActions ?? {},
    });
  }

  for (const o of forecast.upcomingOpportunities ?? []) {
    rows.push({
      run_id: runId,
      user_id: dbUserId,
      source_phase: 'forecasting',
      category: 'opportunity',
      label: o.label,
      description: o.description,
      importance: o.importance ?? 0.7,
      confidence: o.confidence ?? 0.7,
      scope: o.scope ?? 'meta',
      related_entities: o.relatedEntities ?? {},
      recommended_actions: o.recommendedActions ?? {},
    });
  }

  for (const b of forecast.bottlenecks ?? []) {
    rows.push({
      run_id: runId,
      user_id: dbUserId,
      source_phase: 'forecasting',
      category: 'risk',
      label: b.label,
      description: b.description,
      importance: b.importance ?? 0.8,
      confidence: b.confidence ?? 0.7,
      scope: b.scope ?? 'time_energy',
      related_entities: b.relatedEntities ?? {},
      recommended_actions: b.recommendedActions ?? {},
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
      overallConfidence: forecast?.overallConfidence ?? 0.75,
    },
  };
}


