// Mythic Dojo - Dashboard API
// app/api/mythic-dojo/dashboard/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdminClient } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdminClient
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUserId = await resolveUserId(userId);
    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().slice(0, 10);
    const nowStr = now.toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);

    const [progressRes, plansRes, missionsRes, achievementsRes, beltLevelsRes] = await Promise.all([
      supabaseAdminClient
        .from('mythic_belt_progress')
        .select('*')
        .eq('user_id', dbUserId),
      supabaseAdminClient
        .from('mythic_training_plans')
        .select('*')
        .eq('user_id', dbUserId)
        .eq('status', 'active')
        .order('created_at', { ascending: false }),
      supabaseAdminClient
        .from('mythic_training_missions')
        .select('*')
        .eq('user_id', dbUserId)
        .gte('due_date', nowStr)
        .lte('due_date', nextWeekStr)
        .order('due_date', { ascending: true }),
      supabaseAdminClient
        .from('mythic_achievements')
        .select('*')
        .eq('user_id', dbUserId)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false }),
      supabaseAdminClient
        .from('mythic_belt_levels')
        .select('*'),
    ]);

    const progress = progressRes.data ?? [];
    const beltLevels = beltLevelsRes.data ?? [];
    const beltLevelsByArchetype = Object.fromEntries(
      beltLevels.map((bl: any) => [`${bl.archetype_id}_${bl.belt_rank}`, bl])
    );

    const beltProgress = progress.map((p: any) => {
      const beltLevel = beltLevelsByArchetype[`${p.archetype_id}_${p.current_belt_rank}`];
      return {
        archetypeId: p.archetype_id,
        currentXp: p.current_xp,
        currentBeltRank: p.current_belt_rank,
        beltName: beltLevel?.belt_name ?? 'White',
        streakDays: p.streak_days,
      };
    });

    return NextResponse.json({
      beltProgress,
      activePlans: plansRes.data ?? [],
      upcomingMissions: missionsRes.data ?? [],
      recentAchievements: achievementsRes.data ?? [],
    });
  } catch (err) {
    console.error('[API] Mythic Dojo dashboard failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch dashboard' },
      { status: 500 }
    );
  }
}


