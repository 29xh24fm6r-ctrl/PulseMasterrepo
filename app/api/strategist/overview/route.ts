// Meet the Strategist - Overview API
// app/api/strategist/overview/route.ts

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

    const [equilibriumRes, recsRes, conflictsRes] = await Promise.all([
      supabaseAdminClient
        .from('strategic_equilibria')
        .select('*')
        .eq('user_id', dbUserId)
        .order('created_at', { ascending: false })
        .limit(1),
      supabaseAdminClient
        .from('strategy_recommendations')
        .select('*')
        .eq('user_id', dbUserId)
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5),
      supabaseAdminClient
        .from('strategic_conflicts')
        .select('*')
        .eq('user_id', dbUserId)
        .order('severity', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    return NextResponse.json({
      equilibrium: equilibriumRes.data?.[0] ?? null,
      topRecommendations: recsRes.data ?? [],
      recentConflicts: conflictsRes.data ?? [],
    });
  } catch (err) {
    console.error('[API] Strategist overview failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch overview' },
      { status: 500 }
    );
  }
}


