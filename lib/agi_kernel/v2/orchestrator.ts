// AGI Kernel v2 Orchestrator
// lib/agi_kernel/v2/orchestrator.ts

import { supabaseAdmin } from '@/lib/supabase';
import { CognitiveRunContext, PhaseResult } from './types';
import { buildAggregatedBrainContext } from './context_aggregate';
import { runMemorySweepPhase } from './phases/memory_sweep';
import { runModelReconciliationPhase } from './phases/model_reconciliation';
import { runPatternMiningPhase } from './phases/pattern_mining';
import { runForecastingPhase } from './phases/forecasting';
import { runUpdatePlanningPhase } from './phases/update_planning';
import { runSelfReflectionPhase } from './phases/self_reflection';
import { updateSubsystemStatusForUser } from '../../brain/registry/status';
import { logBrainErrorEvent } from '../../brain/registry/errors';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function runAgiKernelLoopForUser(
  userId: string,
  ctx: CognitiveRunContext
) {
  const dbUserId = await resolveUserId(userId);
  const now = ctx.now;

  // 1) Create cognitive_runs row
  const { data: runRows, error: runError } = await supabaseAdmin
    .from('cognitive_runs')
    .insert({
      user_id: dbUserId,
      kind: ctx.kind,
      trigger_type: ctx.triggerType,
      trigger_source: ctx.triggerSource,
      trigger_reference: ctx.triggerReference ?? {},
      started_at: now.toISOString(),
    })
    .select('id');

  if (runError) {
    await logBrainErrorEvent({
      userId,
      subsystemId: 'agi_kernel_v2',
      severity: 'critical',
      errorCode: 'RUN_CREATION_FAILED',
      message: 'Failed to create cognitive_runs row',
      context: { error: runError.message },
    });
    throw runError;
  }

  const runId = runRows?.[0]?.id as string;

  // 2) Aggregate context
  const brainContext = await buildAggregatedBrainContext(userId, now);

  const phaseResults: Record<string, PhaseResult> = {};
  let overallStatus: string = 'completed';
  const safetyFlags: any = { escalated: false, reasons: [] };

  async function runPhase(
    phaseName: string,
    fn: (args: { userId: string; runId: string; ctx: CognitiveRunContext; brainContext: any }) => Promise<PhaseResult>
  ) {
    const { data: phaseRows, error: phaseError } = await supabaseAdmin
      .from('cognitive_phases')
      .insert({
        run_id: runId,
        user_id: dbUserId,
        phase_name: phaseName,
        started_at: new Date().toISOString(),
      })
      .select('id');

    if (phaseError) throw phaseError;
    const phaseId = phaseRows?.[0]?.id as string;

    try {
      const result = await fn({ userId, runId, ctx, brainContext });
      phaseResults[phaseName] = result;

      const { error: updateError } = await supabaseAdmin
        .from('cognitive_phases')
        .update({
          finished_at: new Date().toISOString(),
          status: result.status,
          details: result.data ?? {},
          error_summary: result.errorSummary ?? null,
        })
        .eq('id', phaseId);

      if (updateError) throw updateError;

      if (result.status === 'partial' && overallStatus === 'completed') {
        overallStatus = 'partial';
      }
      if (result.status === 'failed') {
        overallStatus = 'partial';
      }

      return result;
    } catch (err: any) {
      overallStatus = 'partial';

      await supabaseAdmin
        .from('cognitive_phases')
        .update({
          finished_at: new Date().toISOString(),
          status: 'failed',
          error_summary: String(err?.message ?? err),
        })
        .eq('id', phaseId);

      await logBrainErrorEvent({
        userId,
        subsystemId: 'agi_kernel_v2',
        severity: 'error',
        errorCode: `PHASE_${phaseName.toUpperCase()}_FAILED`,
        message: `Phase ${phaseName} failed`,
        context: { error: String(err?.message ?? err) },
      });
    }
  }

  // 3) Run phases (order can depend on ctx.kind if needed)
  await runPhase('memory_sweep', runMemorySweepPhase);
  await runPhase('model_reconciliation', runModelReconciliationPhase);
  await runPhase('pattern_mining', runPatternMiningPhase);
  await runPhase('forecasting', runForecastingPhase);
  await runPhase('update_planning', runUpdatePlanningPhase);
  await runPhase('self_reflection', runSelfReflectionPhase);

  // 4) Compute overall confidence (heuristic: average of phase confidences if included)
  const confidences: number[] = [];
  for (const [name, res] of Object.entries(phaseResults)) {
    const c = (res.data as any)?.overallConfidence;
    if (typeof c === 'number') confidences.push(c);
  }
  const overallConfidence =
    confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0.7;

  const finishedAt = new Date().toISOString();

  const { error: runUpdateError } = await supabaseAdmin
    .from('cognitive_runs')
    .update({
      finished_at: finishedAt,
      status: overallStatus,
      summary: `AGI Kernel v2 run (${ctx.kind}) completed with status ${overallStatus}`,
      overall_confidence: overallConfidence,
      safety_flags: safetyFlags,
    })
    .eq('id', runId);

  if (runUpdateError) throw runUpdateError;

  await updateSubsystemStatusForUser(userId, {
    subsystemId: 'agi_kernel_v2',
    status: overallStatus === 'completed' ? 'active' : 'partial',
    lastRunAt: finishedAt,
    healthScore: overallConfidence,
    details: { lastRunKind: ctx.kind },
  });

  return { runId, status: overallStatus, phaseResults };
}


