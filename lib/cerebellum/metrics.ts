// Cerebellum Routine Metrics
// lib/cerebellum/metrics.ts

import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function updateMotorRoutineMetricsFromRun(userId: string, routineId: string, run: any) {
  const dbUserId = await resolveUserId(userId);

  const { data: existing } = await supabaseAdmin
    .from('motor_routine_metrics')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('routine_id', routineId)
    .limit(1);

  const durationMs = run.finished_at && run.started_at
    ? (new Date(run.finished_at).getTime() - new Date(run.started_at).getTime())
    : null;

  if (!existing?.[0]) {
    const base = {
      user_id: dbUserId,
      routine_id: routineId,
      executions_total: 1,
      executions_success: run.status === 'completed' ? 1 : 0,
      executions_partial: run.status === 'partial' ? 1 : 0,
      executions_failed: run.status === 'failed' ? 1 : 0,
      avg_duration_ms: durationMs,
      avg_steps_executed: run.steps_executed ?? null,
      user_feedback: {},
      optimization_notes: {},
    };
    const { error } = await supabaseAdmin
      .from('motor_routine_metrics')
      .insert(base);
    if (error) throw error;
    return;
  }

  const m = existing[0];
  const totalNew = (m.executions_total ?? 0) + 1;
  const successNew = (m.executions_success ?? 0) + (run.status === 'completed' ? 1 : 0);
  const partialNew = (m.executions_partial ?? 0) + (run.status === 'partial' ? 1 : 0);
  const failedNew = (m.executions_failed ?? 0) + (run.status === 'failed' ? 1 : 0);

  const avgDuration = durationMs != null && m.avg_duration_ms != null
    ? (m.avg_duration_ms * m.executions_total + durationMs) / totalNew
    : durationMs ?? m.avg_duration_ms;

  const avgSteps = run.steps_executed != null && m.avg_steps_executed != null
    ? (m.avg_steps_executed * m.executions_total + run.steps_executed) / totalNew
    : run.steps_executed ?? m.avg_steps_executed;

  const { error } = await supabaseAdmin
    .from('motor_routine_metrics')
    .update({
      updated_at: new Date().toISOString(),
      executions_total: totalNew,
      executions_success: successNew,
      executions_partial: partialNew,
      executions_failed: failedNew,
      avg_duration_ms: avgDuration,
      avg_steps_executed: avgSteps,
    })
    .eq('id', m.id);

  if (error) throw error;
}


