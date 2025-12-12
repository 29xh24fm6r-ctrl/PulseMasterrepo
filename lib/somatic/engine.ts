// Somatic Loop Engine
// lib/somatic/engine.ts

import { supabaseAdmin } from '@/lib/supabase';
import { startOfDay, endOfDay } from 'date-fns';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export async function recordSleepSample(params: {
  userId: string;
  date: Date;
  hours: number;
  quality?: number; // 0–1
}) {
  const dbUserId = await resolveUserId(params.userId);

  const { error } = await supabaseAdmin
    .from('somatic_samples')
    .insert({
      user_id: dbUserId,
      source: 'manual',
      sampled_at: params.date.toISOString(),
      metric: 'sleep_hours',
      value_numeric: params.hours,
      value_json: { quality: params.quality ?? null },
    });

  if (error) {
    console.error('[Somatic] Failed to record sleep sample', error);
    throw error;
  }
}

export async function refreshDailySomaticStateForUser(userId: string, date: Date) {
  const dbUserId = await resolveUserId(userId);
  const day = date.toISOString().slice(0, 10);

  const { data: samples, error } = await supabaseAdmin
    .from('somatic_samples')
    .select('*')
    .eq('user_id', dbUserId)
    .gte('sampled_at', startOfDay(date).toISOString())
    .lte('sampled_at', endOfDay(date).toISOString());

  if (error) throw error;

  // For v1: just use latest 'sleep_hours' metric if exists
  const sleep = samples
    ?.filter((s) => s.metric === 'sleep_hours')
    .sort((a, b) => new Date(b.sampled_at).getTime() - new Date(a.sampled_at).getTime())[0];

  const sleepHours = sleep?.value_numeric ?? null;
  const sleepQuality = sleep?.value_json?.quality ?? null;

  // Simple heuristics:
  // 7–9h -> high energy; <5h -> high fatigue_risk
  let energyScore = 0.6;
  let fatigueRisk = 0.3;

  if (sleepHours != null) {
    if (sleepHours >= 7 && sleepHours <= 9) {
      energyScore = 0.85;
      fatigueRisk = 0.2;
    } else if (sleepHours < 5) {
      energyScore = 0.4;
      fatigueRisk = 0.8;
    } else if (sleepHours < 6) {
      energyScore = 0.5;
      fatigueRisk = 0.7;
    } else if (sleepHours < 7) {
      energyScore = 0.65;
      fatigueRisk = 0.5;
    } else if (sleepHours > 9) {
      energyScore = 0.7; // Oversleeping can reduce energy
      fatigueRisk = 0.4;
    }
  }

  if (sleepQuality != null) {
    // Nudge scores based on quality
    energyScore = clamp(energyScore + (sleepQuality - 0.5) * 0.3, 0, 1);
    fatigueRisk = clamp(fatigueRisk + (0.5 - sleepQuality) * 0.3, 0, 1);
  }

  const { error: upsertError } = await supabaseAdmin
    .from('somatic_state_daily')
    .upsert(
      {
        user_id: dbUserId,
        state_date: day,
        sleep_hours: sleepHours,
        sleep_quality: sleepQuality,
        energy_score: energyScore,
        fatigue_risk: fatigueRisk,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,state_date' }
    );

  if (upsertError) throw upsertError;
}

export async function getSomaticSnapshotForUser(userId: string, date: Date) {
  const dbUserId = await resolveUserId(userId);
  const day = date.toISOString().slice(0, 10);

  const { data, error } = await supabaseAdmin
    .from('somatic_state_daily')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('state_date', day)
    .limit(1);

  if (error) {
    console.error('[Somatic] Failed to get snapshot', error);
    return null;
  }

  return data?.[0] ?? null;
}


