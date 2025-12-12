// Cerebellum Routine Compiler
// lib/cerebellum/compiler.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { MotorRoutineStepBlueprint } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const CEREBELLUM_COMPILE_PROMPT = `
You are the Cerebellum Compiler.

You see:
- A motor_routine definition, including name, description, domain, config.
- Routine may reference known modules: tasks, calendar, CRM, autopilot flows, notifications, etc.

Your job:
- Turn this high-level routine into a sequence of low-level, concrete steps that can run with minimal LLM usage.
- Steps should be:
  - Deterministic.
  - Idempotent when possible.
  - Explicit about parameters (e.g. which tasks, which project, which recipients).

Step kinds include:
- 'task_create': Create a task with params: { title, projectId?, dueDate?, priority? }
- 'notification_send': Send notification with params: { message, channel? }
- 'email_template': Send email with params: { template, recipients, variables }
- 'api_call': Make API call with params: { endpoint, method, body }
- 'autopilot_run': Run autopilot policy with params: { policyId, context }
- 'calendar_block': Block calendar time with params: { start, end, title }
- 'data_sync': Sync data between systems with params: { source, target, mapping }

Return JSON: { "steps": [ { stepIndex, kind, label, params, dependsOn, errorPolicy, retryConfig }, ... ] }.

Only return valid JSON.`;

export async function compileRoutineSteps(userId: string, routineId: string) {
  const dbUserId = await resolveUserId(userId);

  const { data: routineRows } = await supabaseAdmin
    .from('motor_routines')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('id', routineId)
    .limit(1);

  const routine = routineRows?.[0];
  if (!routine) {
    throw new Error(`Routine ${routineId} not found`);
  }

  const result = await callAIJson<{ steps: MotorRoutineStepBlueprint[] }>({
    userId,
    feature: 'cerebellum_compile',
    systemPrompt: CEREBELLUM_COMPILE_PROMPT,
    userPrompt: JSON.stringify({
      routine: {
        name: routine.name,
        description: routine.description,
        domain: routine.domain,
        category: routine.category,
        config: routine.config || {},
      },
    }, null, 2),
    maxTokens: 3000,
    temperature: 0.3, // Lower temperature for more deterministic compilation
  });

  if (!result.success || !result.data || !result.data.steps?.length) {
    console.error('[Cerebellum] Failed to compile routine steps', result.error);
    return;
  }

  const { steps } = result.data;

  // Clear existing steps
  await supabaseAdmin
    .from('motor_routine_steps')
    .delete()
    .eq('user_id', dbUserId)
    .eq('routine_id', routineId);

  // Insert steps
  const rows = steps.map((s) => ({
    user_id: dbUserId,
    routine_id: routineId,
    step_index: s.stepIndex,
    kind: s.kind,
    label: s.label ?? null,
    params: s.params ?? {},
    depends_on: s.dependsOn ?? [],
    error_policy: s.errorPolicy ?? 'continue',
    retry_config: s.retryConfig ?? {},
  }));

  const { error } = await supabaseAdmin
    .from('motor_routine_steps')
    .insert(rows);

  if (error) throw error;

  const { error: updateError } = await supabaseAdmin
    .from('motor_routines')
    .update({
      last_compiled_at: new Date().toISOString(),
    })
    .eq('id', routineId);

  if (updateError) throw updateError;
}


