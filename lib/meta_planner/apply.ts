// Meta-Planner Decision Applicator
// lib/meta_planner/apply.ts

import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function applyPlanningDecisionsForSession(userId: string, sessionId: string) {
  const dbUserId = await resolveUserId(userId);

  const { data: decisions } = await supabaseAdmin
    .from('planning_decisions')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('session_id', sessionId)
    .eq('applied', false);

  if (!decisions?.length) return;

  for (const d of decisions) {
    try {
      const result = await applySingleDecision(userId, d);

      await supabaseAdmin
        .from('planning_decisions')
        .update({
          applied: true,
          applied_at: new Date().toISOString(),
          applied_result: result,
        })
        .eq('id', d.id);
    } catch (err: any) {
      console.error(`[Meta-Planner] Failed to apply decision ${d.id}`, err);
      // Continue with next decision
    }
  }
}

async function applySingleDecision(userId: string, d: any) {
  const dbUserId = await resolveUserId(userId);

  // Switch on decision_kind & target_type, then delegate
  const { decision_kind, target_type, target_id, priority, rationale } = d;

  let beforeState: any = null;
  let afterState: any = null;
  let changeKind = '';

  switch (decision_kind) {
    case 'prioritize_task':
      if (target_type === 'task' && target_id) {
        // Future: wire to tasks.setPriority
        // const task = await getTask(userId, target_id);
        // beforeState = { priority: task.priority };
        // await updateTaskPriority(userId, target_id, priority);
        // afterState = { priority };
        changeKind = 'upgrade_priority';
        console.log(`[Meta-Planner] Would prioritize task ${target_id} to ${priority}`);
      }
      break;

    case 'defer_task':
      if (target_type === 'task' && target_id) {
        // Future: wire to tasks.reschedule
        // const task = await getTask(userId, target_id);
        // beforeState = { dueDate: task.dueDate };
        // const newDate = computeDeferDate(task.dueDate);
        // await rescheduleTask(userId, target_id, newDate);
        // afterState = { dueDate: newDate };
        changeKind = 'reschedule';
        console.log(`[Meta-Planner] Would defer task ${target_id}`);
      }
      break;

    case 'cancel_task':
      if (target_type === 'task' && target_id) {
        // Future: wire to tasks.cancel
        // const task = await getTask(userId, target_id);
        // beforeState = { status: task.status };
        // await cancelTask(userId, target_id);
        // afterState = { status: 'cancelled' };
        changeKind = 'cancel';
        console.log(`[Meta-Planner] Would cancel task ${target_id}`);
      }
      break;

    case 'activate_routine':
      if (target_type === 'routine' && target_id) {
        // Future: wire to cerebellum.activateTrigger
        // const routine = await getRoutine(userId, target_id);
        // beforeState = { status: routine.status };
        // await activateRoutineTrigger(userId, target_id);
        // afterState = { status: 'active' };
        changeKind = 'activate';
        console.log(`[Meta-Planner] Would activate routine ${target_id}`);
      }
      break;

    case 'pause_routine':
      if (target_type === 'routine' && target_id) {
        // Future: wire to cerebellum.pause
        // const routine = await getRoutine(userId, target_id);
        // beforeState = { status: routine.status };
        // await pauseRoutine(userId, target_id);
        // afterState = { status: 'paused' };
        changeKind = 'pause';
        console.log(`[Meta-Planner] Would pause routine ${target_id}`);
      }
      break;

    case 'adjust_goal':
      if (target_type === 'timeline_arc' && target_id) {
        // Future: wire to destiny.updateArc
        // const arc = await getDestinyArc(userId, target_id);
        // beforeState = { focusDomains: arc.focus_domains };
        // await adjustDestinyArc(userId, target_id, adjustments);
        // afterState = { focusDomains: adjusted };
        changeKind = 'adjust';
        console.log(`[Meta-Planner] Would adjust goal ${target_id}`);
      }
      break;

    default:
      console.warn(`[Meta-Planner] Unknown decision kind: ${decision_kind}`);
      return { ok: false, error: 'Unknown decision kind' };
  }

  // Create planning_overrides row if we have state changes
  if (beforeState && afterState && changeKind) {
    await supabaseAdmin
      .from('planning_overrides')
      .insert({
        user_id: dbUserId,
        session_id: d.session_id,
        target_type,
        target_id: target_id ?? null,
        change_kind: changeKind,
        before_state: beforeState,
        after_state: afterState,
        notes: rationale,
      });
  }

  return { ok: true, changeKind };
}


