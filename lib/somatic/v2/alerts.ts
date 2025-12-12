// Somatic Alerts Generator
// lib/somatic/v2/alerts.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const SOMATIC_ALERTS_SYSTEM_PROMPT = `
You are the Somatic Alert Engine.

You see today's somatic metrics and long-term patterns.

Your job:
1. Identify zero or more alerts that matter today, such as:
   - 'burnout_risk'
   - 'sleep_debt'
   - 'overstimulation'
   - 'under_recovery'
   - 'great_recovery'
   - 'good_day_for_push'

2. For each alert, set:
   - severity (0..1)
   - summary (1–2 sentences)
   - recommendedAction (optional gentle suggestion: rest, simplify, move heavy tasks, add walk, etc.)
   - context with key scores (no sensitive raw data, just high-level numbers).

These alerts are used by:
- Conscious Workspace (to adjust load),
- Coaches,
- Behavior Prediction,
- Wisdom Engine.

Never give medical advice. Do not diagnose conditions. Focus on lifestyle-level signals only.

Return JSON: { "alerts": [ ... ] }.

Only return valid JSON.`;

export async function refreshSomaticAlertsForUser(userId: string, date: Date) {
  const day = date.toISOString().slice(0, 10);
  const dbUserId = await resolveUserId(userId);

  const { data: metricsRows } = await supabaseAdmin
    .from('somatic_daily_metrics')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('metrics_date', day)
    .limit(1);

  const metrics = metricsRows?.[0];
  if (!metrics) {
    // No metrics for today yet, skip alerts
    return;
  }

  const { data: patternRows } = await supabaseAdmin
    .from('somatic_patterns')
    .select('*')
    .eq('user_id', dbUserId)
    .limit(1);

  const patterns = patternRows?.[0] ?? null;

  // Get recent metrics for context
  const { data: recentMetrics } = await supabaseAdmin
    .from('somatic_daily_metrics')
    .select('*')
    .eq('user_id', dbUserId)
    .lt('metrics_date', day)
    .order('metrics_date', { ascending: false })
    .limit(7);

  const result = await callAIJson<{
    alerts: Array<{
      kind: string;
      severity: number;
      summary: string;
      recommendedAction?: string;
      context?: any;
    }>;
  }>({
    userId,
    feature: 'somatic_alerts',
    systemPrompt: SOMATIC_ALERTS_SYSTEM_PROMPT,
    userPrompt: JSON.stringify({
      date: day,
      metrics: {
        sleepDurationMinutes: metrics.sleep_duration_minutes,
        sleepQualityScore: metrics.sleep_quality_score,
        recoveryScore: metrics.recovery_score,
        fatigueScore: metrics.fatigue_score,
        stressLoadScore: metrics.stress_load_score,
        stimulationScore: metrics.stimulation_score,
        totalScreenMinutes: metrics.total_screen_minutes,
        notificationCount: metrics.notification_count,
        stepCount: metrics.step_count,
        activityMinutes: metrics.activity_minutes,
      },
      patterns: patterns ? {
        chronotype: patterns.chronotype,
        bestFocusWindows: patterns.best_focus_windows,
        crashPatterns: patterns.crash_patterns,
      } : null,
      recentTrends: recentMetrics ? {
        avgRecoveryScore: recentMetrics.reduce((sum: number, m: any) => sum + (m.recovery_score || 0), 0) / recentMetrics.length,
        avgFatigueScore: recentMetrics.reduce((sum: number, m: any) => sum + (m.fatigue_score || 0), 0) / recentMetrics.length,
        avgSleepHours: recentMetrics.reduce((sum: number, m: any) => sum + ((m.sleep_duration_minutes || 0) / 60), 0) / recentMetrics.length,
      } : null,
    }, null, 2),
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data || !result.data.alerts?.length) {
    return;
  }

  const { alerts } = result.data;

  // Delete existing alerts for today
  await supabaseAdmin
    .from('somatic_alerts')
    .delete()
    .eq('user_id', dbUserId)
    .eq('metrics_date', day);

  const rows = alerts.map((a) => ({
    user_id: dbUserId,
    occurred_at: new Date().toISOString(),
    metrics_date: day,
    kind: a.kind,
    severity: a.severity,
    summary: a.summary,
    recommended_action: a.recommendedAction ?? null,
    context: a.context ?? {},
  }));

  const { error } = await supabaseAdmin
    .from('somatic_alerts')
    .insert(rows);

  if (error) {
    console.error('[Somatic v2] Failed to insert alerts', error);
    throw error;
  }
}


