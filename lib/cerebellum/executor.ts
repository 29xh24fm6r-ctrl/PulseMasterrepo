// Cerebellum Routine Executor
// lib/cerebellum/executor.ts

import { supabaseAdmin } from '@/lib/supabase';
import { updateMotorRoutineMetricsFromRun } from './metrics';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function runMotorRoutine(
  userId: string,
  routineId: string,
  triggerId?: string,
  contextOverride?: any
) {
  const dbUserId = await resolveUserId(userId);

  // Create run row
  const { data: runRows, error: runError } = await supabaseAdmin
    .from('motor_routine_runs')
    .insert({
      user_id: dbUserId,
      routine_id: routineId,
      trigger_id: triggerId ?? null,
      context: contextOverride ?? {},
    })
    .select('id');

  if (runError) throw runError;
  const runId = runRows?.[0]?.id as string;

  // Load steps
  const { data: steps } = await supabaseAdmin
    .from('motor_routine_steps')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('routine_id', routineId)
    .order('step_index', { ascending: true });

  const total = steps?.length ?? 0;

  let executed = 0;
  let errorSummary: string | null = null;
  let status: string = 'completed';

  for (const step of steps ?? []) {
    try {
      await executeMotorStep(userId, step);
      executed++;
    } catch (err: any) {
      errorSummary = String(err?.message ?? err);
      if (step.error_policy === 'abort') {
        status = 'failed';
        break;
      } else if (step.error_policy === 'retry_later') {
        status = 'partial';
        // Optionally schedule retry (future enhancement)
        break;
      } else {
        // 'continue'
        status = 'partial';
        continue;
      }
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from('motor_routine_runs')
    .update({
      finished_at: new Date().toISOString(),
      status,
      steps_executed: executed,
      steps_total: total,
      error_summary: errorSummary,
    })
    .eq('id', runId);

  if (updateError) throw updateError;

  // Update metrics asynchronously
  const run = { ...runRows[0], status, steps_executed: executed, finished_at: new Date().toISOString() };
  await updateMotorRoutineMetricsFromRun(userId, routineId, run);

  // Update trigger last_fired_at
  if (triggerId) {
    await supabaseAdmin
      .from('motor_routine_triggers')
      .update({ last_fired_at: new Date().toISOString() })
      .eq('id', triggerId);
  }

  return { runId, status, executed, total };
}

async function executeMotorStep(userId: string, step: any) {
  // Switch on step.kind; call existing engines
  const { kind, params } = step;

  switch (kind) {
    case 'task_create':
      // Future: wire to tasks.create
      console.log('[Cerebellum] Would create task:', params);
      // await createTask(userId, params);
      break;

    case 'notification_send':
      // Future: wire to notifications.send
      console.log('[Cerebellum] Would send notification:', params);
      // await sendNotification(userId, params);
      break;

    case 'email_template':
      // Future: wire to email.sendTemplate
      console.log('[Cerebellum] Would send email:', params);
      // await sendEmailTemplate(userId, params);
      break;

    case 'api_call':
      // Future: wire to API client
      console.log('[Cerebellum] Would make API call:', params);
      // await makeAPICall(params);
      break;

    case 'autopilot_run':
      // Future: wire to autopilot.runPolicy
      console.log('[Cerebellum] Would run autopilot policy:', params);
      // await runAutopilotPolicy(userId, params);
      break;

    case 'calendar_block':
      // Future: wire to calendar.blockTime
      console.log('[Cerebellum] Would block calendar:', params);
      // await blockCalendarTime(userId, params);
      break;

    case 'data_sync':
      // Future: wire to data sync service
      console.log('[Cerebellum] Would sync data:', params);
      // await syncData(userId, params);
      break;

    default:
      console.warn(`[Cerebellum] Unknown step kind: ${kind}`);
      // For v1, we'll just log and continue
      break;
  }
}


