// Mythic Dojo v1 - Achievements System
// lib/mythic_dojo/v1/achievements.ts

import { supabaseAdminClient } from '../../supabase/admin';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdminClient
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function evaluateMythicAchievements(
  userId: string,
  archetypeId: string,
  progress: { currentXp: number; currentBeltRank: number; streakDays: number }
) {
  const dbUserId = await resolveUserId(userId);

  const { data: existing } = await supabaseAdminClient
    .from('mythic_achievements')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('archetype_id', archetypeId);

  const haveCode = (code: string) =>
    !!existing?.find((a: any) => a.code === code);

  const toInsert: any[] = [];

  if (progress.currentXp >= 50 && !haveCode('MYTHIC_50_XP')) {
    toInsert.push({
      user_id: dbUserId,
      archetype_id: archetypeId,
      code: 'MYTHIC_50_XP',
      label: 'First 50 XP',
      description: 'You have earned 50 XP training this archetype.',
      meta: {},
    });
  }

  if (progress.currentXp >= 100 && !haveCode('MYTHIC_100_XP')) {
    toInsert.push({
      user_id: dbUserId,
      archetype_id: archetypeId,
      code: 'MYTHIC_100_XP',
      label: 'Century',
      description: 'You have earned 100 XP training this archetype.',
      meta: {},
    });
  }

  if (progress.currentBeltRank >= 3 && !haveCode('MYTHIC_ORANGE_BELT')) {
    toInsert.push({
      user_id: dbUserId,
      archetype_id: archetypeId,
      code: 'MYTHIC_ORANGE_BELT',
      label: 'Orange Belt',
      description: 'You reached Orange Belt for this archetype.',
      meta: {},
    });
  }

  if (progress.currentBeltRank >= 5 && !haveCode('MYTHIC_BLUE_BELT')) {
    toInsert.push({
      user_id: dbUserId,
      archetype_id: archetypeId,
      code: 'MYTHIC_BLUE_BELT',
      label: 'Blue Belt',
      description: 'You reached Blue Belt for this archetype.',
      meta: {},
    });
  }

  if (progress.streakDays >= 7 && !haveCode('MYTHIC_7_DAY_STREAK')) {
    toInsert.push({
      user_id: dbUserId,
      archetype_id: archetypeId,
      code: 'MYTHIC_7_DAY_STREAK',
      label: '7-Day Archetype Streak',
      description: 'You trained this archetype for 7 days in a row.',
      meta: {},
    });
  }

  if (progress.streakDays >= 30 && !haveCode('MYTHIC_30_DAY_STREAK')) {
    toInsert.push({
      user_id: dbUserId,
      archetype_id: archetypeId,
      code: 'MYTHIC_30_DAY_STREAK',
      label: '30-Day Archetype Streak',
      description: 'You trained this archetype for 30 days in a row.',
      meta: {},
    });
  }

  if (!toInsert.length) return [];

  const { data, error } = await supabaseAdminClient
    .from('mythic_achievements')
    .insert(toInsert)
    .select('*');

  if (error) throw error;
  return data ?? [];
}


