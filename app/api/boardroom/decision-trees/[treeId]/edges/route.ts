// Decision Theater v2 - Tree Edges API
// app/api/boardroom/decision-trees/[treeId]/edges/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectNodes } from '@/lib/boardroom/theater_v2/builder';
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
    const { fromNodeId, toNodeId, label, description } = body;

    if (!fromNodeId || !toNodeId) {
      return NextResponse.json({ error: 'fromNodeId and toNodeId required' }, { status: 400 });
    }

    const edge = await connectNodes({
      userId,
      treeId: params.treeId,
      fromNodeId,
      toNodeId,
      label,
      description,
    });

    return NextResponse.json({ edge });
  } catch (err) {
    console.error('[API] Decision tree edge creation failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create edge' },
      { status: 500 }
    );
  }
}


