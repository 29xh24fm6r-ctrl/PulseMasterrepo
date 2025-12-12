// Decision Theater v2 - Branch Comparison API
// app/api/boardroom/decision-trees/[treeId]/compare/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { compareBranches } from '@/lib/boardroom/theater_v2/compare';
import { supabaseAdminClient } from '@/lib/supabase/admin';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdminClient
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { treeId: string } }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await resolveUserId(clerkId);

    // Verify tree belongs to user
    const { data: tree } = await supabaseAdminClient
      .from('decision_trees')
      .select('*')
      .eq('id', params.treeId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!tree) {
      return NextResponse.json({ error: 'Tree not found' }, { status: 404 });
    }

    const body = await req.json();
    const runIds = body.runIds;

    const comparison = await compareBranches({
      treeId: params.treeId,
      runIds,
    });

    return NextResponse.json({ comparison });
  } catch (err) {
    console.error('[API] Branch comparison failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to compare branches' },
      { status: 500 }
    );
  }
}


