// Mythic Dojo - Archetype Detail API
// app/api/mythic-dojo/archetype/[id]/route.ts

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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUserId = await resolveUserId(userId);
    const archetypeId = params.id;
    const now = new Date();
    const nowStr = now.toISOString().slice(0, 10);
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);

    const [
      archetypeRes,
      progressRes,
      ladderRes,
      plansRes,
      missionsRes,
      achievementsRes,
    ] = await Promise.all([
      supabaseAdminClient
        .from('archetype_definitions')
        .select('*')
        .eq('id', archetypeId)
        .maybeSingle(),
      supabaseAdminClient
        .from('mythic_belt_progress')
        .select('*')
        .eq('user_id', dbUserId)
        .eq('archetype_id', archetypeId)
        .maybeSingle(),
      supabaseAdminClient
        .from('mythic_belt_levels')
        .select('*')
        .eq('archetype_id', archetypeId)
        .order('belt_rank', { ascending: true }),
      supabaseAdminClient
        .from('mythic_training_plans')
        .select('*')
        .eq('user_id', dbUserId)
        .eq('archetype_id', archetypeId)
        .order('created_at', { ascending: false }),
      supabaseAdminClient
        .from('mythic_training_missions')
        .select('*')
        .eq('user_id', dbUserId)
        .eq('archetype_id', archetypeId)
        .or(`due_date.gte.${thirtyDaysAgo},due_date.lte.${nextWeekStr}`)
        .order('due_date', { ascending: true }),
      supabaseAdminClient
        .from('mythic_achievements')
        .select('*')
        .eq('user_id', dbUserId)
        .eq('archetype_id', archetypeId)
        .order('created_at', { ascending: false }),
    ]);

    if (!archetypeRes.data) {
      return NextResponse.json({ error: 'Archetype not found' }, { status: 404 });
    }

    const progress = progressRes.data;
    const currentBelt = progress
      ? ladderRes.data?.find((l: any) => l.belt_rank === progress.current_belt_rank)
      : ladderRes.data?.[0];

    return NextResponse.json({
      archetype: archetypeRes.data,
      beltProgress: progress
        ? {
            ...progress,
            beltName: currentBelt?.belt_name ?? 'White',
            nextBelt: ladderRes.data?.find(
              (l: any) => l.belt_rank === (progress.current_belt_rank + 1)
            ),
          }
        : null,
      beltLadder: ladderRes.data ?? [],
      plans: plansRes.data ?? [],
      missions: missionsRes.data ?? [],
      achievements: achievementsRes.data ?? [],
    });
  } catch (err) {
    console.error('[API] Mythic Dojo archetype detail failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch archetype details' },
      { status: 500 }
    );
  }
}


