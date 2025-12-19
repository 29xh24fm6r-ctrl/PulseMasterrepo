// Global Sense of Self Mirror v1 - Signal Aggregator
// lib/selfmirror/signals.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';
import { SelfPerceptionSignal, SignalCategory, SignalDirection, SignalSource } from './types';

export async function recordSelfPerceptionSignal(params: {
  userId: string;
  source: SignalSource;
  category: SignalCategory;
  direction: SignalDirection;
  description?: string;
  weight?: number;
  occurredAt?: Date;
}): Promise<void> {
  const { userId, source, category, direction, description, weight = 1.0, occurredAt } = params;

  await supabaseAdmin
    .from('self_perception_signals')
    .insert({
      user_id: userId,
      source,
      category,
      direction,
      weight,
      description: description ?? null,
      occurred_at: occurredAt?.toISOString() ?? new Date().toISOString(),
    });
}

export async function ingestSignalsFromSystems(userId: string): Promise<void> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

  // 1. Tasks: followthrough signals
  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('id, due_date, completed_at, status')
    .eq('user_id', userId)
    .gte('created_at', thirtyDaysAgoStr);

  if (tasks) {
    const overdueTasks = tasks.filter((t) => {
      if (!t.due_date || t.completed_at) return false;
      return new Date(t.due_date) < now;
    });

    if (overdueTasks.length > 0) {
      await recordSelfPerceptionSignal({
        userId,
        source: 'tasks',
        category: 'followthrough',
        direction: overdueTasks.length > 5 ? 'conflicts_identity' : 'neutral',
        description: `${overdueTasks.length} overdue tasks`,
        weight: Math.min(overdueTasks.length / 10, 2.0),
      });
    }

    const onTimeTasks = tasks.filter((t) => t.completed_at && t.due_date && new Date(t.completed_at) <= new Date(t.due_date));
    if (onTimeTasks.length > 5) {
      await recordSelfPerceptionSignal({
        userId,
        source: 'tasks',
        category: 'followthrough',
        direction: 'supports_identity',
        description: `${onTimeTasks.length} tasks completed on time`,
        weight: Math.min(onTimeTasks.length / 20, 1.5),
      });
    }
  }

  // 2. Calendar: overload signals
  const { data: calendarEvents } = await supabaseAdmin
    .from('calendar_events')
    .select('id, start_time, end_time')
    .eq('user_id', userId)
    .gte('start_time', thirtyDaysAgoStr)
    .lte('start_time', now.toISOString());

  if (calendarEvents) {
    // Count hours per day
    const hoursByDay = new Map<string, number>();
    for (const event of calendarEvents) {
      const day = new Date(event.start_time).toISOString().slice(0, 10);
      const duration = (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / (1000 * 60 * 60);
      hoursByDay.set(day, (hoursByDay.get(day) ?? 0) + duration);
    }

    const avgHoursPerDay = Array.from(hoursByDay.values()).reduce((a, b) => a + b, 0) / hoursByDay.size;
    if (avgHoursPerDay > 10) {
      await recordSelfPerceptionSignal({
        userId,
        source: 'calendar',
        category: 'overload',
        direction: 'conflicts_identity',
        description: `Average ${avgHoursPerDay.toFixed(1)} hours/day scheduled`,
        weight: Math.min((avgHoursPerDay - 8) / 2, 2.0),
      });
    }
  }

  // 3. Emotion OS: replenishment signals
  const { data: emotionStates } = await supabaseAdmin
    .from('emotion_state_daily')
    .select('date, stress_score, resilience_score')
    .eq('user_id', userId)
    .gte('date', thirtyDaysAgoStr)
    .order('date', { ascending: false })
    .limit(30);

  if (emotionStates && emotionStates.length > 0) {
    const avgStress = emotionStates.reduce((sum, e) => sum + (e.stress_score ?? 0), 0) / emotionStates.length;
    if (avgStress > 7) {
      await recordSelfPerceptionSignal({
        userId,
        source: 'emotion_os',
        category: 'replenishment',
        direction: 'conflicts_identity',
        description: `High average stress: ${avgStress.toFixed(1)}/10`,
        weight: Math.min((avgStress - 5) / 2, 2.0),
      });
    }
  }

  // 4. Civilization domains: balance signals
  const { data: domainStates } = await supabaseAdmin
    .from('civilization_domain_state')
    .select('*, civilization_domains(*)')
    .eq('civilization_domains.user_id', userId)
    .gte('snapshot_date', thirtyDaysAgoStr)
    .order('snapshot_date', { ascending: false });

  if (domainStates && domainStates.length > 0) {
    // Check for extreme imbalances
    const workState = domainStates.find((s: any) => s.civilization_domains?.key === 'work');
    const familyState = domainStates.find((s: any) => s.civilization_domains?.key === 'family');

    if (workState && familyState) {
      const workActivity = workState.activity_score ?? 0;
      const familyActivity = familyState.activity_score ?? 0;
      const imbalance = Math.abs(workActivity - familyActivity);

      if (imbalance > 50) {
        await recordSelfPerceptionSignal({
          userId,
          source: 'civilization',
          category: 'relationship_nourishment',
          direction: workActivity > familyActivity ? 'conflicts_identity' : 'neutral',
          description: `Work-Family imbalance: ${imbalance.toFixed(0)} points`,
          weight: Math.min(imbalance / 50, 2.0),
        });
      }
    }
  }

  // 5. Finance: risk_taking signals (placeholder - would need financial data)
  // This would check spending patterns, savings moves, etc.
}


