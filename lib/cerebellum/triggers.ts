// Cerebellum Routine Triggers
// lib/cerebellum/triggers.ts

import { supabaseAdmin } from '@/lib/supabase';
import { RoutineTriggerConfig } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function upsertRoutineTrigger(
  userId: string,
  routineId: string,
  config: RoutineTriggerConfig
) {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('motor_routine_triggers')
    .insert({
      user_id: dbUserId,
      routine_id: routineId,
      trigger_type: config.triggerType,
      schedule: config.schedule ?? null,
      event_filter: config.eventFilter ?? {},
      state_condition: config.stateCondition ?? {},
    })
    .select('id');

  if (error) throw error;
  return data?.[0]?.id as string;
}

export async function getDueTriggersForUser(userId: string, now: Date) {
  const dbUserId = await resolveUserId(userId);

  // For now, we'll check time-based triggers
  // In a full implementation, this would parse cron/rrule schedules
  // For v1, we'll return enabled time triggers that haven't fired recently
  const { data, error } = await supabaseAdmin
    .from('motor_routine_triggers')
    .select('*, motor_routines(*)')
    .eq('user_id', dbUserId)
    .eq('enabled', true)
    .eq('trigger_type', 'time')
    .or('last_fired_at.is.null,last_fired_at.lt.' + now.toISOString());

  if (error) {
    console.error('[Cerebellum] Failed to fetch due triggers', error);
    return [];
  }

  // Filter by schedule logic (simplified for v1)
  // In production, this would parse cron/rrule and check if now matches
  return (data || []).filter((trigger: any) => {
    // Basic check: if schedule exists and hasn't fired today, consider it due
    if (trigger.schedule && trigger.last_fired_at) {
      const lastFired = new Date(trigger.last_fired_at);
      const today = new Date(now);
      if (lastFired.toDateString() === today.toDateString()) {
        return false; // Already fired today
      }
    }
    return true;
  });
}


