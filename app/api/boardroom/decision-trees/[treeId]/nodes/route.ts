// Decision Theater v2 - Tree Nodes API
// app/api/boardroom/decision-trees/[treeId]/nodes/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { addNodeToTree } from '@/lib/boardroom/theater_v2/builder';
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
    const { parentNodeId, label, description, relatedDecisionOptionId, relatedTimelineId, pivotAtDate } = body;

    if (!label) {
      return NextResponse.json({ error: 'label required' }, { status: 400 });
    }

    const node = await addNodeToTree({
      userId,
      treeId: params.treeId,
      parentNodeId,
      label,
      description,
      relatedDecisionOptionId,
      relatedTimelineId,
      pivotAtDate,
    });

    return NextResponse.json({ node });
  } catch (err) {
    console.error('[API] Decision tree node creation failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create node' },
      { status: 500 }
    );
  }
}


