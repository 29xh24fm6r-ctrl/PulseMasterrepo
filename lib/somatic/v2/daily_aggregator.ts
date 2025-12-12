// Daily Somatic Metrics Aggregator
// lib/somatic/v2/daily_aggregator.ts

import { supabaseAdmin } from '@/lib/supabase';
import { SomaticDailyMetrics } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function computeSomaticDailyMetricsForUser(userId: string, date: Date) {
  const day = date.toISOString().slice(0, 10);
  const dbUserId = await resolveUserId(userId);

  const start = new Date(day + 'T00:00:00.000Z');
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const { data: events, error } = await supabaseAdmin
    .from('somatic_raw_device_events')
    .select('*')
    .eq('user_id', dbUserId)
    .gte('occurred_at', start.toISOString())
    .lt('occurred_at', end.toISOString());

  if (error) throw error;

  // Initialize metrics
  const metrics: Partial<SomaticDailyMetrics> = {
    userId: dbUserId,
    metricsDate: day,
  };

  // Aggregate raw events into metrics
  let totalScreenMinutes = 0;
  let nightScreenMinutes = 0;
  let unlockCount = 0;
  let notificationCount = 0;
  let focusAppMinutes = 0;
  let socialAppMinutes = 0;
  let entertainmentMinutes = 0;
  let messagingMinutes = 0;
  let navigationMinutes = 0;
  let sleepDurationMinutes: number | null = null;
  let sleepEfficiency: number | null = null;
  let sleepQualityScore: number | null = null;
  let bedtimeLocal: string | null = null;
  let wakeTimeLocal: string | null = null;
  let restingHeartRate: number | null = null;
  let hrVariability: number | null = null;
  let stepCount = 0;
  let activityMinutes = 0;
  let sedentaryMinutes = 0;

  const focusApps = ['calendar', 'notes', 'coding', 'docs', 'slack', 'email'];
  const socialApps = ['instagram', 'twitter', 'facebook', 'linkedin', 'tiktok'];
  const entertainmentApps = ['youtube', 'netflix', 'spotify', 'games'];
  const messagingApps = ['messages', 'whatsapp', 'telegram', 'signal'];

  // Track screen on/off pairs
  const screenSessions: Array<{ start: Date; end?: Date }> = [];
  let currentScreenSession: { start: Date; end?: Date } | null = null;

  for (const event of events || []) {
    const eventTime = new Date(event.occurred_at);
    const hour = eventTime.getHours();

    // Screen time tracking
    if (event.kind === 'screen_on') {
      currentScreenSession = { start: eventTime };
    } else if (event.kind === 'screen_off' && currentScreenSession) {
      currentScreenSession.end = eventTime;
      screenSessions.push(currentScreenSession);
      const duration = (currentScreenSession.end.getTime() - currentScreenSession.start.getTime()) / (1000 * 60);
      totalScreenMinutes += duration;
      if (hour >= 22 || hour < 4) {
        nightScreenMinutes += duration;
      }
      currentScreenSession = null;
    }

    // Unlocks
    if (event.kind === 'unlock') {
      unlockCount++;
    }

    // Notifications
    if (event.kind === 'notification') {
      notificationCount++;
    }

    // App usage
    if (event.kind === 'app_open' || event.kind === 'app_usage') {
      const appName = (event.metadata?.appName || '').toLowerCase();
      const duration = event.metadata?.durationMinutes || 0;

      if (focusApps.some((a) => appName.includes(a))) {
        focusAppMinutes += duration;
      } else if (socialApps.some((a) => appName.includes(a))) {
        socialAppMinutes += duration;
      } else if (entertainmentApps.some((a) => appName.includes(a))) {
        entertainmentMinutes += duration;
      } else if (messagingApps.some((a) => appName.includes(a))) {
        messagingMinutes += duration;
      } else if (appName.includes('maps') || appName.includes('navigation')) {
        navigationMinutes += duration;
      }
    }

    // Sleep data
    if (event.kind === 'sleep_segment' || event.kind === 'sleep') {
      sleepDurationMinutes = event.metadata?.durationMinutes || null;
      sleepEfficiency = event.metadata?.efficiency || null;
      sleepQualityScore = event.metadata?.qualityScore || null;
      bedtimeLocal = event.metadata?.bedtime || null;
      wakeTimeLocal = event.metadata?.wakeTime || null;
    }

    // Heart rate
    if (event.kind === 'hr_sample' || event.kind === 'heart_rate') {
      if (event.metadata?.resting) {
        restingHeartRate = event.metadata?.value || null;
      }
      if (event.metadata?.hrv) {
        hrVariability = event.metadata?.hrv || null;
      }
    }

    // Steps
    if (event.kind === 'step_chunk' || event.kind === 'steps') {
      stepCount += event.metadata?.count || 0;
    }

    // Activity
    if (event.kind === 'activity') {
      activityMinutes += event.metadata?.minutes || 0;
    }
  }

  // Compute derived scores (simple heuristics for v2)
  const recoveryScore = computeRecoveryScore({
    sleepDurationMinutes,
    sleepQualityScore,
    hrVariability,
    activityMinutes,
  });

  const stimulationScore = computeStimulationScore({
    totalScreenMinutes,
    nightScreenMinutes,
    notificationCount,
    socialAppMinutes,
    entertainmentMinutes,
  });

  const fatigueScore = computeFatigueScore({
    sleepDurationMinutes,
    sleepQualityScore,
    recoveryScore,
    stimulationScore,
  });

  const stressLoadScore = computeStressLoadScore({
    notificationCount,
    unlockCount,
    stimulationScore,
    fatigueScore,
  });

  const circadianAlignment = computeCircadianAlignment({
    bedtimeLocal,
    wakeTimeLocal,
    sleepDurationMinutes,
  });

  // Upsert metrics
  const { error: upsertError } = await supabaseAdmin
    .from('somatic_daily_metrics')
    .upsert(
      {
        user_id: dbUserId,
        metrics_date: day,
        total_screen_minutes: totalScreenMinutes > 0 ? Math.round(totalScreenMinutes) : null,
        night_screen_minutes: nightScreenMinutes > 0 ? Math.round(nightScreenMinutes) : null,
        unlock_count: unlockCount > 0 ? unlockCount : null,
        notification_count: notificationCount > 0 ? notificationCount : null,
        deep_work_disruptions: null, // TODO: compute from work blocks
        focus_app_minutes: focusAppMinutes > 0 ? Math.round(focusAppMinutes) : null,
        social_app_minutes: socialAppMinutes > 0 ? Math.round(socialAppMinutes) : null,
        entertainment_minutes: entertainmentMinutes > 0 ? Math.round(entertainmentMinutes) : null,
        messaging_minutes: messagingMinutes > 0 ? Math.round(messagingMinutes) : null,
        navigation_minutes: navigationMinutes > 0 ? Math.round(navigationMinutes) : null,
        sleep_duration_minutes: sleepDurationMinutes,
        sleep_efficiency: sleepEfficiency,
        sleep_quality_score: sleepQualityScore,
        bedtime_local: bedtimeLocal,
        wake_time_local: wakeTimeLocal,
        resting_heart_rate: restingHeartRate,
        hr_variability: hrVariability,
        step_count: stepCount > 0 ? stepCount : null,
        activity_minutes: activityMinutes > 0 ? activityMinutes : null,
        sedentary_minutes: null, // TODO: compute from activity
        recovery_score: recoveryScore,
        stimulation_score: stimulationScore,
        fatigue_score: fatigueScore,
        stress_load_score: stressLoadScore,
        circadian_alignment: circadianAlignment,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,metrics_date' }
    );

  if (upsertError) {
    console.error('[Somatic v2] Failed to upsert daily metrics', upsertError);
    throw upsertError;
  }
}

// Helper functions for derived scores
function computeRecoveryScore(params: {
  sleepDurationMinutes: number | null;
  sleepQualityScore: number | null;
  hrVariability: number | null;
  activityMinutes: number;
}): number {
  let score = 0.5; // baseline

  if (params.sleepDurationMinutes) {
    const sleepHours = params.sleepDurationMinutes / 60;
    if (sleepHours >= 7 && sleepHours <= 9) {
      score += 0.2;
    } else if (sleepHours < 6) {
      score -= 0.3;
    }
  }

  if (params.sleepQualityScore !== null) {
    score += (params.sleepQualityScore - 0.5) * 0.3;
  }

  if (params.hrVariability !== null) {
    // Higher HRV = better recovery (normalized)
    score += (params.hrVariability - 0.5) * 0.2;
  }

  return Math.max(0, Math.min(1, score));
}

function computeStimulationScore(params: {
  totalScreenMinutes: number;
  nightScreenMinutes: number;
  notificationCount: number;
  socialAppMinutes: number;
  entertainmentMinutes: number;
}): number {
  let score = 0;

  // Screen time
  if (params.totalScreenMinutes > 600) { // >10 hours
    score += 0.4;
  } else if (params.totalScreenMinutes > 480) { // >8 hours
    score += 0.3;
  } else if (params.totalScreenMinutes > 360) { // >6 hours
    score += 0.2;
  }

  // Night screen time
  if (params.nightScreenMinutes > 60) {
    score += 0.3;
  }

  // Notifications
  if (params.notificationCount > 200) {
    score += 0.2;
  } else if (params.notificationCount > 100) {
    score += 0.1;
  }

  // Social/entertainment apps
  const passiveMinutes = params.socialAppMinutes + params.entertainmentMinutes;
  if (passiveMinutes > 180) { // >3 hours
    score += 0.2;
  }

  return Math.max(0, Math.min(1, score));
}

function computeFatigueScore(params: {
  sleepDurationMinutes: number | null;
  sleepQualityScore: number | null;
  recoveryScore: number;
  stimulationScore: number;
}): number {
  let score = 0.3; // baseline

  if (params.sleepDurationMinutes) {
    const sleepHours = params.sleepDurationMinutes / 60;
    if (sleepHours < 6) {
      score += 0.4;
    } else if (sleepHours < 7) {
      score += 0.2;
    }
  }

  if (params.sleepQualityScore !== null && params.sleepQualityScore < 0.5) {
    score += 0.2;
  }

  score += (1 - params.recoveryScore) * 0.3;
  score += params.stimulationScore * 0.2;

  return Math.max(0, Math.min(1, score));
}

function computeStressLoadScore(params: {
  notificationCount: number;
  unlockCount: number;
  stimulationScore: number;
  fatigueScore: number;
}): number {
  let score = 0.2; // baseline

  if (params.notificationCount > 150) {
    score += 0.3;
  } else if (params.notificationCount > 100) {
    score += 0.2;
  }

  if (params.unlockCount > 100) {
    score += 0.2;
  }

  score += params.stimulationScore * 0.2;
  score += params.fatigueScore * 0.3;

  return Math.max(0, Math.min(1, score));
}

function computeCircadianAlignment(params: {
  bedtimeLocal: string | null;
  wakeTimeLocal: string | null;
  sleepDurationMinutes: number | null;
}): number {
  // Simple heuristic: consistent sleep schedule = better alignment
  // For v2, we'll use a default if no data
  if (!params.bedtimeLocal || !params.wakeTimeLocal) {
    return 0.5; // unknown
  }

  // TODO: Compare against user's historical patterns
  // For now, return a moderate score
  return 0.6;
}


