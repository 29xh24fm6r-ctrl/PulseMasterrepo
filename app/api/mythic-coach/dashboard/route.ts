// Mythic Coach - Dashboard API
// app/api/mythic-coach/dashboard/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
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

    const [focusRes, plansRes, missionsRes, reflectionsRes] = await Promise.all([
      supabaseAdmin
        .from('mythic_training_focus')
        .select('*')
        .eq('user_id', dbUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from('mythic_training_plans')
        .select('*')
        .eq('user_id', dbUserId)
        .eq('status', 'active')
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('mythic_training_missions')
        .select('*')
        .eq('user_id', dbUserId)
        .gte('due_date', now.toISOString().slice(0, 10))
        .lte('due_date', nextWeekStr)
        .order('due_date', { ascending: true }),
      supabaseAdmin
        .from('mythic_training_reflections')
        .select('*')
        .eq('user_id', dbUserId)
        .order('created_at', { ascending: false })
        .limit(4),
    ]);

    return NextResponse.json({
      focus: focusRes.data,
      activePlans: plansRes.data ?? [],
      upcomingMissions: missionsRes.data ?? [],
      recentReflections: reflectionsRes.data ?? [],
    });
  } catch (err) {
    console.error('[API] Mythic Coach dashboard failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch dashboard' },
      { status: 500 }
    );
  }
}


