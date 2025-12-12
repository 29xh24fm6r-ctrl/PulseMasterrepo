// Workspace Helper Functions
// lib/workspace/helpers.ts

import { supabaseAdmin } from '@/lib/supabase';
import { getWorkCortexContextForUser } from '@/lib/cortex/context';
import { getEmotionSnapshotForUser } from '@/lib/emotion/engine';
import { getSomaticSnapshotForUser } from '@/lib/somatic/engine';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

/**
 * Get daily plan for user (simplified version)
 */
export async function getDailyPlanForUser(userId: string, date: Date): Promise<any> {
  const dbUserId = await resolveUserId(userId);
  const dateStr = date.toISOString().slice(0, 10);

  // Try to get from day_plans table if it exists
  const { data: plan } = await supabaseAdmin
    .from('day_plans')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('date', dateStr)
    .maybeSingle();

  if (plan) {
    return {
      focus: plan.focus || plan.summary || 'No specific focus today',
      focusAreas: plan.focus_areas || [],
      items: plan.items || [],
    };
  }

  // Fallback: get today's tasks
  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('due_date', dateStr)
    .in('status', ['pending', 'in_progress'])
    .limit(10);

  return {
    focus: 'Complete today\'s tasks',
    focusAreas: ['work'],
    items: (tasks || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      type: 'task',
    })),
  };
}

/**
 * Get emotion snapshot for user (wrapper)
 */
export async function getEmotionSnapshotForWorkspace(userId: string, date: Date): Promise<any> {
  const snapshot = await getEmotionSnapshotForUser(userId, date);
  
  if (!snapshot) {
    return {
      avgValence: 0,
      avgArousal: 0.5,
      dominantLabels: [],
      stressScore: 0.3,
    };
  }

  return {
    avgValence: snapshot.avg_valence ?? 0,
    avgArousal: snapshot.avg_arousal ?? 0.5,
    dominantLabels: snapshot.dominant_labels ?? [],
    stressScore: snapshot.stress_score ?? 0.3,
  };
}

/**
 * Get somatic snapshot for workspace
 */
export async function getSomaticSnapshotForWorkspace(userId: string, date: Date): Promise<any> {
  const snapshot = await getSomaticSnapshotForUser(userId, date);
  
  if (!snapshot) {
    return {
      sleepHours: null,
      sleepQuality: null,
      energyScore: 0.6,
      fatigueRisk: 0.3,
    };
  }

  return {
    sleepHours: snapshot.sleep_hours,
    sleepQuality: snapshot.sleep_quality,
    energyScore: snapshot.energy_score ?? 0.6,
    fatigueRisk: snapshot.fatigue_risk ?? 0.3,
  };
}

/**
 * Get cortex context for workspace
 */
export async function getCortexContextForWorkspace(userId: string, date: Date): Promise<any> {
  try {
    return await getWorkCortexContextForUser(userId);
  } catch (err) {
    console.warn('[Workspace] Failed to get cortex context', err);
    return {
      recentSignals: [],
      strongestPatterns: [],
      topSkills: [],
      latestPredictions: [],
      recentAnomalies: [],
    };
  }
}

