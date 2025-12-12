// Somatic Context Snapshot
// lib/somatic/v2/context.ts

import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function getSomaticSnapshotForUser(userId: string, date: Date) {
  const day = date.toISOString().slice(0, 10);
  const dbUserId = await resolveUserId(userId);

  const { data: metricsRows } = await supabaseAdmin
    .from('somatic_daily_metrics')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('metrics_date', day)
    .limit(1);

  const metrics = metricsRows?.[0] ?? null;

  const { data: patternRows } = await supabaseAdmin
    .from('somatic_patterns')
    .select('*')
    .eq('user_id', dbUserId)
    .limit(1);

  const patterns = patternRows?.[0] ?? null;

  const { data: alertRows } = await supabaseAdmin
    .from('somatic_alerts')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('metrics_date', day);

  return {
    metrics: metrics ? {
      recoveryScore: metrics.recovery_score,
      fatigueScore: metrics.fatigue_score,
      stressLoadScore: metrics.stress_load_score,
      stimulationScore: metrics.stimulation_score,
      circadianAlignment: metrics.circadian_alignment,
      sleepDurationMinutes: metrics.sleep_duration_minutes,
      sleepQualityScore: metrics.sleep_quality_score,
      totalScreenMinutes: metrics.total_screen_minutes,
      notificationCount: metrics.notification_count,
      stepCount: metrics.step_count,
      activityMinutes: metrics.activity_minutes,
    } : null,
    patterns: patterns ? {
      chronotype: patterns.chronotype,
      bestFocusWindows: patterns.best_focus_windows,
      lowEnergyWindows: patterns.low_energy_windows,
      socialEnergyWindows: patterns.social_energy_windows,
      crashPatterns: patterns.crash_patterns,
      stimulationSensitivity: patterns.stimulation_sensitivity,
      exerciseEffects: patterns.exercise_effects,
      summary: patterns.summary,
    } : null,
    alerts: (alertRows || []).map((a: any) => ({
      kind: a.kind,
      severity: a.severity,
      summary: a.summary,
      recommendedAction: a.recommended_action,
      context: a.context,
    })),
  };
}


