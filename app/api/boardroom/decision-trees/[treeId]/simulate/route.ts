// Decision Theater v2 - Branch Simulation API
// app/api/boardroom/decision-trees/[treeId]/simulate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { runBranchSimulations } from '@/lib/simulation/multitimeline';
import { supabaseAdmin } from '@/lib/supabase/admin';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
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
    const { data: tree } = await supabaseAdmin
      .from('decision_trees')
      .select('*')
      .eq('id', params.treeId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!tree) {
      return NextResponse.json({ error: 'Tree not found' }, { status: 404 });
    }

    const body = await req.json();
    const maxPaths = body.maxPaths || 10;

    const runs = await runBranchSimulations({
      userId,
      treeId: params.treeId,
      maxPaths,
    });

    return NextResponse.json({ runs });
  } catch (err) {
    console.error('[API] Branch simulation failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to run simulations' },
      { status: 500 }
    );
  }
}


