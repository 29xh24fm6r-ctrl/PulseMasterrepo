// Conscious Workspace v1 - Workspace Day Log Engine
// lib/workspace/day_log.ts

import { supabaseAdminClient } from '../../supabase/admin';
import { callAI } from '@/lib/ai/call';
import { WorkspaceDayLog } from './types';
import { recordSelfPerceptionSignal } from '../selfmirror/signals';
import { computeDomainStates } from '../thirdbrain/civilization/engine';

export async function finalizeWorkspaceDay(params: {
  userId: string;
  date: Date;
  summary?: string;
}): Promise<WorkspaceDayLog> {
  const { userId, date, summary: manualSummary } = params;
  const dateStr = date.toISOString().slice(0, 10);

  // 1. Load current focus state
  const { data: focusState } = await supabaseAdminClient
    .from('workspace_focus_states')
    .select('*')
    .eq('user_id', userId)
    .lte('applied_at', `${dateStr}T23:59:59`)
    .order('applied_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 2. Aggregate day data
  // Get completed tasks
  const { data: completedTasks } = await supabaseAdminClient
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .eq('completed_at::date', dateStr);

  // Get calendar events
  const { data: calendarEvents } = await supabaseAdminClient
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .gte('start_time', `${dateStr}T00:00:00`)
    .lte('start_time', `${dateStr}T23:59:59`);

  // Get deals moved forward
  const { data: dealUpdates } = await supabaseAdminClient
    .from('deals')
    .select('*')
    .eq('user_id', userId)
    .gte('updated_at', `${dateStr}T00:00:00`)
    .lte('updated_at', `${dateStr}T23:59:59`);

  // Get emotion state for the day
  const { data: emotionState } = await supabaseAdminClient
    .from('emotion_state_daily')
    .select('*')
    .eq('user_id', userId)
    .eq('date', dateStr)
    .maybeSingle();

  // 3. Compute key signals
  const keySignals: any = {
    completed_tasks: completedTasks?.length ?? 0,
    completed_focus_blocks: 0, // Placeholder - would come from focus timer
    major_deal_moves: dealUpdates?.length ?? 0,
    calendar_hours: calendarEvents?.reduce((sum, e) => {
      const duration = (new Date(e.end_time).getTime() - new Date(e.start_time).getTime()) / (1000 * 60 * 60);
      return sum + duration;
    }, 0) ?? 0,
    family_time_hours: 0, // Placeholder - would come from calendar tags or time tracking
    stress_score: emotionState?.stress_score ?? null,
    resilience_score: emotionState?.resilience_score ?? null,
  };

  // 4. Get Self Mirror alignment before/after
  const { data: snapshotBefore } = await supabaseAdminClient
    .from('self_identity_snapshots')
    .select('overall_self_alignment')
    .eq('user_id', userId)
    .lt('taken_at', `${dateStr}T00:00:00`)
    .order('taken_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: snapshotAfter } = await supabaseAdminClient
    .from('self_identity_snapshots')
    .select('overall_self_alignment')
    .eq('user_id', userId)
    .gte('taken_at', `${dateStr}T00:00:00`)
    .order('taken_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let alignmentDelta: number | null = null;
  if (snapshotBefore && snapshotAfter) {
    alignmentDelta = (snapshotAfter.overall_self_alignment ?? 0) - (snapshotBefore.overall_self_alignment ?? 0);
  }

  // 5. Generate summary via LLM
  const summaryPrompt = `Date: ${dateStr}
Focus State: ${focusState ? `${focusState.focus_mode} (Timeline: ${focusState.active_timeline_id ?? 'N/A'})` : 'None'}

Completed Tasks: ${completedTasks?.length ?? 0}
Calendar Hours: ${keySignals.calendar_hours.toFixed(1)}
Deal Moves: ${dealUpdates?.length ?? 0}
Stress Score: ${emotionState?.stress_score ?? 'N/A'}/10
Resilience Score: ${emotionState?.resilience_score ?? 'N/A'}/10

${manualSummary ? `Manual Reflection: ${manualSummary}\n\n` : ''}Generate a 3-5 sentence daily reflection summary.`;

  const summaryResult = await callAI({
    userId,
    feature: 'workspace_day_log',
    systemPrompt: 'You are a daily reflection assistant. Generate a thoughtful summary of how the day went.',
    userPrompt: summaryPrompt,
    maxTokens: 500,
    temperature: 0.7,
  });

  const summary = summaryResult.success && summaryResult.content
    ? summaryResult.content
    : manualSummary ?? `Day summary for ${dateStr}`;

  // 6. Determine executed timeline
  let executedTimelineId: string | null = null;
  if (focusState?.active_timeline_id) {
    executedTimelineId = focusState.active_timeline_id;
  }

  // 7. Save day log
  const { data: dayLog, error } = await supabaseAdminClient
    .from('workspace_day_log')
    .upsert(
      {
        user_id: userId,
        date: dateStr,
        chosen_focus_state_id: focusState?.id ?? null,
        executed_timeline_id: executedTimelineId,
        summary,
        key_signals: keySignals,
        alignment_delta: alignmentDelta !== null ? Math.round(alignmentDelta * 100) / 100 : null,
      },
      { onConflict: 'user_id,date' }
    )
    .select('*')
    .single();

  if (error) throw error;

  // 8. Feed back into other systems
  // Record self-perception signals
  if (completedTasks && completedTasks.length > 0) {
    await recordSelfPerceptionSignal({
      userId,
      source: 'tasks',
      category: 'followthrough',
      direction: 'supports_identity',
      description: `${completedTasks.length} tasks completed`,
      weight: Math.min(completedTasks.length / 5, 2.0),
      occurredAt: date,
    });
  }

  // Update civilization domain states (weekly, not daily - but trigger if needed)
  // This would typically run weekly, but we can trigger it here if it's been a while
  const lastDomainState = await supabaseAdminClient
    .from('civilization_domain_state')
    .select('snapshot_date')
    .eq('civilization_domains.user_id', userId)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const daysSinceLastState = lastDomainState
    ? (new Date(date).getTime() - new Date(lastDomainState.snapshot_date).getTime()) / (1000 * 60 * 60 * 24)
    : 999;

  if (daysSinceLastState >= 7) {
    // Trigger weekly civilization update
    await computeDomainStates(userId, date);
  }

  return dayLog;
}


