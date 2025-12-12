// Meta-Planner Constraint Collector
// lib/meta_planner/constraints.ts

import { supabaseAdmin } from '@/lib/supabase';
import { PlanningContextInput } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function collectPlanningContext(
  userId: string,
  kind: PlanningContextInput['kind'],
  consciousFrame?: any
): Promise<PlanningContextInput> {
  const dbUserId = await resolveUserId(userId);
  const day = new Date().toISOString().slice(0, 10);

  const [
    timelineCtx,
    destinyCtx,
    selfMirror,
    emotionState,
    somatic,
    socialStateRows,
    tasksSnapshot,
    routinesSnapshot,
    calendarSnapshot,
    conflictsRows,
  ] = await Promise.all([
    // Timeline context
    (async () => {
      const { data } = await supabaseAdmin
        .from('timeline_decisions')
        .select('*')
        .eq('user_id', dbUserId)
        .eq('is_current', true)
        .limit(1);
      return data?.[0] ?? null;
    })().catch(() => null),

    // Destiny context
    (async () => {
      const [arcs, blueprints] = await Promise.all([
        supabaseAdmin
          .from('destiny_arcs')
          .select('*')
          .eq('user_id', dbUserId)
          .eq('is_current', true)
          .limit(1),
        supabaseAdmin
          .from('destiny_blueprints')
          .select('*')
          .eq('user_id', dbUserId)
          .eq('is_primary', true)
          .limit(1),
      ]);
      return {
        arc: arcs.data?.[0] ?? null,
        blueprint: blueprints.data?.[0] ?? null,
      };
    })().catch(() => null),

    // Self mirror
    (async () => {
      const { data } = await supabaseAdmin
        .from('self_mirror_snapshots')
        .select('*')
        .eq('user_id', dbUserId)
        .order('snapshot_date', { ascending: false })
        .limit(1);
      return data?.[0] ?? null;
    })().catch(() => null),

    // Emotion state
    (async () => {
      const { data } = await supabaseAdmin
        .from('emotion_state_daily')
        .select('*')
        .eq('user_id', dbUserId)
        .order('state_date', { ascending: false })
        .limit(1);
      return data?.[0] ?? null;
    })().catch(() => null),

    // Somatic state
    (async () => {
      const { getSomaticSnapshotForUser } = await import('@/lib/somatic/v2/context');
      return await getSomaticSnapshotForUser(userId, new Date()).catch(() => null);
    })(),

    // Social state
    supabaseAdmin
      .from('social_state_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('snapshot_date', day)
      .limit(1),

    // Tasks snapshot (placeholder - wire to actual tasks table)
    supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('user_id', dbUserId)
      .in('status', ['todo', 'in_progress'])
      .limit(100)
      .catch(() => ({ data: [] })),

    // Routines snapshot
    supabaseAdmin
      .from('motor_routines')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('status', 'active'),

    // Calendar snapshot (placeholder - wire to actual calendar table)
    supabaseAdmin
      .from('calendar_events')
      .select('*')
      .eq('user_id', dbUserId)
      .gte('start_time', new Date().toISOString())
      .lte('start_time', new Date(Date.now() + 7 * 86400000).toISOString())
      .catch(() => ({ data: [] })),

    // Conflicts
    consciousFrame
      ? supabaseAdmin
          .from('conscious_conflicts')
          .select('*')
          .eq('user_id', dbUserId)
          .eq('frame_id', consciousFrame.id)
      : Promise.resolve({ data: [] }),
  ]);

  const socialState = socialStateRows?.data?.[0] ?? null;
  const conflicts = conflictsRows?.data ?? [];

  return {
    kind,
    triggerSource: 'brainstem',
    consciousFrame,
    conflicts,
    timelineContext: timelineCtx,
    destinyContext: destinyCtx,
    selfMirrorSnapshot: selfMirror,
    emotionState,
    somaticState: somatic,
    socialState,
    cultureContexts: [], // Future: wire to culture context provider
    tasksSnapshot: tasksSnapshot?.data ?? [],
    routinesSnapshot: routinesSnapshot?.data ?? [],
    calendarSnapshot: calendarSnapshot?.data ?? [],
  };
}


