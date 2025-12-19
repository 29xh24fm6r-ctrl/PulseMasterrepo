// Mythic Intelligence - Deal Detail API
// app/api/mythic/deal/[dealId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUserId = await resolveUserId(userId);
    const dealId = params.dealId;

    const { data: runs, error } = await supabaseAdmin
      .from('deal_archetype_runs')
      .select('*, mythic_archetypes(*)')
      .eq('user_id', dbUserId)
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const latestRun = runs?.[0] ?? null;

    return NextResponse.json({
      latestRun,
      history: runs ?? [],
      recommendedStrategy: latestRun?.recommended_strategy ?? null,
    });
  } catch (err) {
    console.error('[API] Mythic deal detail failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch deal archetype data' },
      { status: 500 }
    );
  }
}


