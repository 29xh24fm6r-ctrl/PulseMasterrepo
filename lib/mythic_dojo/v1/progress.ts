// Mythic Dojo v1 - Belt Progress System
// lib/mythic_dojo/v1/progress.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getBeltLadder } from './belt_table';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function awardMythicXpForMission(
  userId: string,
  params: { archetypeId: string; missionId: string; xp: number; missionDate: Date }
) {
  const dbUserId = await resolveUserId(userId);
  const { archetypeId, xp, missionDate } = params;

  const ladder = await getBeltLadder(archetypeId);

  if (!ladder.length) return { currentXp: 0, currentBeltRank: 1, streakDays: 0 };

  const dateStr = missionDate.toISOString().slice(0, 10);

  const { data: currentRow } = await supabaseAdmin
    .from('mythic_belt_progress')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('archetype_id', archetypeId)
    .maybeSingle();

  let currentXp = currentRow?.current_xp ?? 0;
  let currentBeltRank = currentRow?.current_belt_rank ?? ladder[0].belt_rank;
  let streakDays = currentRow?.streak_days ?? 0;
  let lastUpdated = currentRow?.updated_at ? new Date(currentRow.updated_at) : null;

  currentXp += xp;

  // simple streak logic: if lastUpdated was yesterday, increment; if older, reset.
  if (lastUpdated) {
    const diffDays = Math.floor(
      (missionDate.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 1) streakDays += 1;
    else if (diffDays > 1) streakDays = 1;
  } else {
    streakDays = 1;
  }

  // compute belt
  let newBeltRank = currentBeltRank;
  let lastPromotionAt = currentRow?.last_promotion_at ?? null;

  for (const level of ladder) {
    if (currentXp >= level.required_xp && level.belt_rank > newBeltRank) {
      newBeltRank = level.belt_rank;
      lastPromotionAt = missionDate.toISOString();
    }
  }

  const payload = {
    user_id: dbUserId,
    archetype_id: archetypeId,
    current_xp: currentXp,
    current_belt_rank: newBeltRank,
    last_promotion_at: lastPromotionAt,
    total_missions_completed: (currentRow?.total_missions_completed ?? 0) + 1,
    streak_days: streakDays,
    updated_at: missionDate.toISOString(),
  };

  if (!currentRow) {
    await supabaseAdmin.from('mythic_belt_progress').insert(payload);
  } else {
    await supabaseAdmin
      .from('mythic_belt_progress')
      .update(payload)
      .eq('id', currentRow.id);
  }

  return { currentXp, currentBeltRank: newBeltRank, streakDays };
}


