// Somatic Pattern Inference
// lib/somatic/v2/patterns.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { SomaticPatternModel } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const SOMATIC_PATTERNS_SYSTEM_PROMPT = `
You are the Somatic Pattern Engine for a life OS.

You see daily somatic metrics for one user:
- Phone usage (screen time, notifications, etc.).
- Sleep duration & quality.
- Activity/steps, resting heart rate, HRV (if available).
- Derived scores: recovery, fatigue, stress_load, circadian_alignment.

Your job:
1. Infer a chronotype:
   - 'early_bird', 'night_owl', 'bimodal', or 'unclear'.

2. Identify:
   - best_focus_windows: times of day when the user is most likely to be effective at deep work.
   - low_energy_windows: times where heavy demands often go poorly.
   - social_energy_windows: where calls/meetings tend to be easier.

3. Describe crash_patterns:
   - e.g., "After 2+ nights of <6h sleep, there is a strong crash around day 3."

4. Describe stimulation_sensitivity:
   - how much night-time screen + notifications correlate with poor next-day recovery.

5. Describe exercise_effects on next-day energy and stress.

Return JSON:
{
  "patternModel": {
    "chronotype": "...",
    "bestFocusWindows": [...],
    "lowEnergyWindows": [...],
    "socialEnergyWindows": [...],
    "crashPatterns": { ... },
    "stimulationSensitivity": { ... },
    "exerciseEffects": { ... },
    "summary": "..."
  }
}

Only return valid JSON.`;

export async function refreshSomaticPatternsForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const { data: metrics, error } = await supabaseAdmin
    .from('somatic_daily_metrics')
    .select('*')
    .eq('user_id', dbUserId)
    .order('metrics_date', { ascending: true })
    .limit(120); // last ~4 months

  if (error) throw error;
  if (!metrics || metrics.length === 0) {
    console.warn('[Somatic v2] No metrics found for pattern inference');
    return;
  }

  const result = await callAIJson<{ patternModel: SomaticPatternModel }>({
    userId,
    feature: 'somatic_patterns',
    systemPrompt: SOMATIC_PATTERNS_SYSTEM_PROMPT,
    userPrompt: JSON.stringify({
      metrics: metrics.slice(0, 90).map((m: any) => ({
        date: m.metrics_date,
        sleepDurationMinutes: m.sleep_duration_minutes,
        sleepQualityScore: m.sleep_quality_score,
        bedtimeLocal: m.bedtime_local,
        wakeTimeLocal: m.wake_time_local,
        totalScreenMinutes: m.total_screen_minutes,
        nightScreenMinutes: m.night_screen_minutes,
        notificationCount: m.notification_count,
        recoveryScore: m.recovery_score,
        fatigueScore: m.fatigue_score,
        stressLoadScore: m.stress_load_score,
        stepCount: m.step_count,
        activityMinutes: m.activity_minutes,
        restingHeartRate: m.resting_heart_rate,
        hrVariability: m.hr_variability,
      })),
    }, null, 2),
    maxTokens: 2500,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Somatic v2] Failed to generate patterns', result.error);
    return;
  }

  const { patternModel } = result.data;

  const { error: upsertError } = await supabaseAdmin
    .from('somatic_patterns')
    .upsert(
      {
        user_id: dbUserId,
        chronotype: patternModel.chronotype ?? null,
        best_focus_windows: patternModel.bestFocusWindows ?? [],
        low_energy_windows: patternModel.lowEnergyWindows ?? [],
        social_energy_windows: patternModel.socialEnergyWindows ?? [],
        crash_patterns: patternModel.crashPatterns ?? {},
        stimulation_sensitivity: patternModel.stimulationSensitivity ?? {},
        exercise_effects: patternModel.exerciseEffects ?? {},
        summary: patternModel.summary ?? null,
        last_refreshed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (upsertError) {
    console.error('[Somatic v2] Failed to upsert patterns', upsertError);
    throw upsertError;
  }
}


