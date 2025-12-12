// Simulation Input Context Builder
// lib/simulation/v2/builder.ts

import { SimulationRunInputContext } from './types';
import { getSomaticSnapshotForUser } from '@/lib/somatic/v2/context';
import { getCurrentNarrativeContextForUser } from '@/lib/narrative/context';
import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

async function getGoalsSnapshotForUser(userId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);

  const { data } = await supabaseAdmin
    .from('goals')
    .select('*')
    .eq('user_id', dbUserId)
    .in('status', ['active', 'in_progress'])
    .limit(10);

  return {
    activeGoals: data || [],
  };
}

async function getHabitsSnapshotForUser(userId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);

  const { data } = await supabaseAdmin
    .from('habits')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('status', 'active')
    .limit(20);

  return {
    activeHabits: data || [],
  };
}

async function getSomaticPatternsForUser(userId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);

  const { data } = await supabaseAdmin
    .from('somatic_patterns')
    .select('*')
    .eq('user_id', dbUserId)
    .limit(1);

  return data?.[0] ?? null;
}

async function getSocialGraphSummaryForUser(userId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);

  const { data: insights } = await supabaseAdmin
    .from('social_insights')
    .select('*')
    .eq('user_id', dbUserId)
    .order('generated_at', { ascending: false })
    .limit(1);

  return insights?.[0] ?? null;
}

async function getValueProfileForUser(userId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);

  const { data } = await supabaseAdmin
    .from('value_profile')
    .select('*')
    .eq('user_id', dbUserId)
    .limit(1);

  return data?.[0] ?? null;
}

async function getWisdomMetaSummaryForUser(userId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);

  const { data: lessons } = await supabaseAdmin
    .from('wisdom_lessons')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('status', 'active')
    .order('strength', { ascending: false })
    .limit(10);

  const { data: playbooks } = await supabaseAdmin
    .from('wisdom_playbooks')
    .select('*')
    .eq('user_id', dbUserId)
    .order('usage_count', { ascending: false })
    .limit(5);

  return {
    topLessons: (lessons || []).slice(0, 5).map((l: any) => ({
      title: l.title,
      summary: l.summary,
      strength: l.strength,
    })),
    topPlaybooks: (playbooks || []).slice(0, 3).map((p: any) => ({
      key: p.key,
      name: p.name,
      description: p.description,
    })),
  };
}

export async function buildSimulationInputContext(
  userId: string,
  date: Date,
  horizonDays: number
): Promise<SimulationRunInputContext> {
  const seedDate = date.toISOString().slice(0, 10);

  const [
    goals,
    habits,
    somaticToday,
    somaticPatterns,
    socialGraph,
    narrativeContext,
    valueProfile,
    wisdomSummary,
  ] = await Promise.all([
    getGoalsSnapshotForUser(userId).catch(() => null),
    getHabitsSnapshotForUser(userId).catch(() => null),
    getSomaticSnapshotForUser(userId, date).catch(() => null),
    getSomaticPatternsForUser(userId).catch(() => null),
    getSocialGraphSummaryForUser(userId).catch(() => null),
    getCurrentNarrativeContextForUser(userId).catch(() => null),
    getValueProfileForUser(userId).catch(() => null),
    getWisdomMetaSummaryForUser(userId).catch(() => null),
  ]);

  return {
    seedDate,
    horizonDays,
    goals,
    habits,
    somaticToday,
    somaticPatterns,
    socialGraph,
    narrativeContext,
    valueProfile,
    wisdomSummary,
  };
}


