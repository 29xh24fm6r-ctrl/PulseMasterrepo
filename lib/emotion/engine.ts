// Emotional Resonance Engine
// lib/emotion/engine.ts

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

export async function recordEmotionSample(params: {
  userId: string;
  source: string;
  valence?: number;
  arousal?: number;
  labels?: string[];
  confidence?: number;
  payload?: any;
}) {
  const dbUserId = await resolveUserId(params.userId);

  const { error } = await supabaseAdmin
    .from('emotion_samples')
    .insert({
      user_id: dbUserId,
      source: params.source,
      valence: params.valence ?? null,
      arousal: params.arousal ?? null,
      labels: params.labels ?? null,
      confidence: params.confidence ?? 1,
      payload: params.payload ?? {},
    });

  if (error) {
    console.error('[Emotion] Failed to record sample', error);
    throw error;
  }
}

function avg(values: (number | null)[]): number | null {
  const filtered = values.filter((v): v is number => v !== null);
  if (filtered.length === 0) return null;
  return filtered.reduce((sum, v) => sum + v, 0) / filtered.length;
}

function topLabels(labels: string[], limit: number = 3): string[] {
  const counts: Record<string, number> = {};
  labels.forEach(label => {
    counts[label] = (counts[label] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label]) => label);
}

export async function refreshDailyEmotionStateForUser(userId: string, date: Date) {
  const dbUserId = await resolveUserId(userId);
  const day = date.toISOString().slice(0, 10);

  const { data: samples, error } = await supabaseAdmin
    .from('emotion_samples')
    .select('*')
    .eq('user_id', dbUserId)
    .gte('sampled_at', startOfDay(date).toISOString())
    .lte('sampled_at', endOfDay(date).toISOString());

  if (error) throw error;

  if (!samples || samples.length === 0) {
    // No samples today, skip aggregation
    return;
  }

  // Simple numeric averages for v1
  const avgValence = avg(samples.map((s) => s.valence).filter((v) => v !== null));
  const avgArousal = avg(samples.map((s) => s.arousal).filter((v) => v !== null));

  const allLabels = samples.flatMap((s) => s.labels ?? []);
  const dominantLabels = topLabels(allLabels);

  // Naive stress_score: high arousal + negative valence
  const stressScore = Math.min(
    1,
    ((avgArousal ?? 0) * 0.6) + ((avgValence ?? 0) < 0 ? Math.abs(avgValence!) * 0.4 : 0)
  );

  // Resilience score: simple heuristic based on recovery patterns
  // For v1, we'll use a placeholder
  const resilienceScore = 0.5; // TODO: compute from historical patterns

  const { error: upsertError } = await supabaseAdmin
    .from('emotion_state_daily')
    .upsert(
      {
        user_id: dbUserId,
        state_date: day,
        avg_valence: avgValence,
        avg_arousal: avgArousal,
        dominant_labels: dominantLabels,
        stress_score: stressScore,
        resilience_score: resilienceScore,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,state_date' }
    );

  if (upsertError) throw upsertError;
}

export async function getEmotionSnapshotForUser(userId: string, date: Date) {
  const dbUserId = await resolveUserId(userId);
  const day = date.toISOString().slice(0, 10);

  const { data, error } = await supabaseAdmin
    .from('emotion_state_daily')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('state_date', day)
    .limit(1);

  if (error) {
    console.error('[Emotion] Failed to get snapshot', error);
    return null;
  }

  return data?.[0] ?? null;
}


