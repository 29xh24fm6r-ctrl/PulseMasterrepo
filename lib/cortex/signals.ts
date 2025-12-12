// Neocortex Signals Engine
// lib/cortex/signals.ts

import { supabaseAdmin } from '@/lib/supabase';
import { CortexSignal, CortexAreaKey } from './types';
import { startOfDay, endOfDay } from 'date-fns';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function refreshDailyWorkSignalsForUser(userId: string, date: Date) {
  const areaKey: CortexAreaKey = 'work';
  const windowDate = date.toISOString().slice(0, 10);
  const dbUserId = await resolveUserId(userId);

  // 1. Load raw events for that date
  const start = startOfDay(date).toISOString();
  const end = endOfDay(date).toISOString();

  const { data: events, error } = await supabaseAdmin
    .from('cortex_events')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('area_key', areaKey)
    .gte('event_time', start)
    .lte('event_time', end);

  if (error) throw error;

  // 2. Compute signals
  const signals: CortexSignal[] = [];

  signals.push(
    computeDeepWorkMinutes(events || [], userId, areaKey, windowDate),
    computeCompletedTasks(events || [], userId, areaKey, windowDate),
    computeOverdueTasks(events || [], userId, areaKey, windowDate),
    computeDealTouches(events || [], userId, areaKey, windowDate),
    computeDealProgressEvents(events || [], userId, areaKey, windowDate),
    computeMeetingCount(events || [], userId, areaKey, windowDate),
    computeEmailSentCount(events || [], userId, areaKey, windowDate),
    computeContextSwitchCount(events || [], userId, areaKey, windowDate),
  );

  // Filter out undefined/null
  const filtered = signals.filter(Boolean) as CortexSignal[];

  if (filtered.length === 0) return;

  // 3. Upsert into cortex_signals
  // Resolve all user IDs first
  const resolvedRows = await Promise.all(
    filtered.map(async (s) => ({
      user_id: await resolveUserId(s.userId),
      area_key: s.areaKey,
      window_date: s.windowDate,
      scope: s.scope,
      scope_ref: s.scopeRef ?? null,
      key: s.key,
      value_numeric: s.valueNumeric ?? null,
      value_json: s.valueJson ?? null,
      sample_count: s.sampleCount ?? null,
      meta: s.meta ?? {},
    }))
  );

  const { error: upsertError } = await supabaseAdmin
    .from('cortex_signals')
    .upsert(resolvedRows, { onConflict: 'user_id,area_key,window_date,scope,scope_ref,key' });

  if (upsertError) throw upsertError;
}

// Signal calculators
function computeDeepWorkMinutes(
  events: any[],
  userId: string,
  areaKey: CortexAreaKey,
  windowDate: string
): CortexSignal | null {
  // Simple heuristic: consecutive task completions without meetings/emails
  // For v1, we'll use a simple count of task completions in focused blocks
  const taskEvents = events.filter(e => e.event_type === 'TASK_COMPLETED');
  const meetingEvents = events.filter(e => e.event_type === 'MEETING_HELD');
  
  // Estimate: each completed task in a block = ~30 min of deep work
  // Subtract time lost to meetings
  const estimatedMinutes = Math.max(0, (taskEvents.length * 30) - (meetingEvents.length * 30));

  return {
    userId,
    areaKey,
    windowDate,
    scope: 'global',
    key: 'deep_work_minutes',
    valueNumeric: estimatedMinutes,
    sampleCount: taskEvents.length,
  };
}

function computeCompletedTasks(
  events: any[],
  userId: string,
  areaKey: CortexAreaKey,
  windowDate: string
): CortexSignal | null {
  const count = events.filter(e => e.event_type === 'TASK_COMPLETED').length;
  return {
    userId,
    areaKey,
    windowDate,
    scope: 'global',
    key: 'completed_tasks_count',
    valueNumeric: count,
    sampleCount: count,
  };
}

function computeOverdueTasks(
  events: any[],
  userId: string,
  areaKey: CortexAreaKey,
  windowDate: string
): CortexSignal | null {
  // For v1, we'll need to query tasks table directly
  // This is a placeholder - would need actual task data
  return null;
}

function computeDealTouches(
  events: any[],
  userId: string,
  areaKey: CortexAreaKey,
  windowDate: string
): CortexSignal | null {
  const dealEvents = events.filter(e => 
    e.context_type === 'deal' && 
    ['DEAL_STAGE_CHANGED', 'DEAL_CREATED'].includes(e.event_type)
  );
  const uniqueDeals = new Set(dealEvents.map(e => e.context_id));
  return {
    userId,
    areaKey,
    windowDate,
    scope: 'global',
    key: 'deal_touches_count',
    valueNumeric: uniqueDeals.size,
    sampleCount: dealEvents.length,
  };
}

function computeDealProgressEvents(
  events: any[],
  userId: string,
  areaKey: CortexAreaKey,
  windowDate: string
): CortexSignal | null {
  const count = events.filter(e => e.event_type === 'DEAL_STAGE_CHANGED').length;
  return {
    userId,
    areaKey,
    windowDate,
    scope: 'global',
    key: 'deal_progress_events',
    valueNumeric: count,
    sampleCount: count,
  };
}

function computeMeetingCount(
  events: any[],
  userId: string,
  areaKey: CortexAreaKey,
  windowDate: string
): CortexSignal | null {
  const count = events.filter(e => e.event_type === 'MEETING_HELD').length;
  return {
    userId,
    areaKey,
    windowDate,
    scope: 'global',
    key: 'meeting_count',
    valueNumeric: count,
    sampleCount: count,
  };
}

function computeEmailSentCount(
  events: any[],
  userId: string,
  areaKey: CortexAreaKey,
  windowDate: string
): CortexSignal | null {
  const count = events.filter(e => e.event_type === 'EMAIL_SENT').length;
  return {
    userId,
    areaKey,
    windowDate,
    scope: 'global',
    key: 'email_sent_count',
    valueNumeric: count,
    sampleCount: count,
  };
}

function computeContextSwitchCount(
  events: any[],
  userId: string,
  areaKey: CortexAreaKey,
  windowDate: string
): CortexSignal | null {
  // Count transitions between different context types
  const contextTypes: string[] = [];
  events.forEach(e => {
    if (e.context_type && !contextTypes.includes(e.context_type)) {
      contextTypes.push(e.context_type);
    }
  });
  // Context switches = number of different contexts - 1
  const switches = Math.max(0, contextTypes.length - 1);
  return {
    userId,
    areaKey,
    windowDate,
    scope: 'global',
    key: 'context_switch_count',
    valueNumeric: switches,
    sampleCount: contextTypes.length,
  };
}

export async function refreshDailySignalsForAllUsers(date: Date) {
  // Get all active users
  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select('clerk_id')
    .limit(100); // Limit for v1

  if (error) {
    console.error('[Cortex] Failed to fetch users for signal refresh', error);
    return;
  }

  for (const user of users || []) {
    if (user.clerk_id) {
      try {
        await refreshDailyWorkSignalsForUser(user.clerk_id, date);
      } catch (err) {
        console.error(`[Cortex] Failed to refresh signals for user ${user.clerk_id}`, err);
      }
    }
  }
}


