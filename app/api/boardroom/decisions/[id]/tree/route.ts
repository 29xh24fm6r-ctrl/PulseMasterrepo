// Decision Theater v2 - Decision Tree API
// app/api/boardroom/decisions/[id]/tree/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createDecisionTreeForDecision } from '@/lib/boardroom/theater_v2/builder';
import { supabaseAdmin } from '@/lib/supabase/admin';

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
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await resolveUserId(clerkId);

    // Get tree for decision
    const { data: tree, error: treeError } = await supabaseAdmin
      .from('decision_trees')
      .select('*')
      .eq('decision_id', params.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (treeError) throw treeError;

    if (!tree) {
      return NextResponse.json({ tree: null });
    }

    // Get nodes
    const { data: nodes, error: nodesError } = await supabaseAdmin
      .from('decision_tree_nodes')
      .select('*')
      .eq('tree_id', tree.id)
      .order('depth', { ascending: true });

    if (nodesError) throw nodesError;

    // Get edges
    const { data: edges, error: edgesError } = await supabaseAdmin
      .from('decision_tree_edges')
      .select('*')
      .eq('tree_id', tree.id);

    if (edgesError) throw edgesError;

    // Get latest simulations
    const { data: simulations, error: simError } = await supabaseAdmin
      .from('branch_simulation_runs')
      .select('*')
      .eq('tree_id', tree.id)
      .order('run_at', { ascending: false })
      .limit(10);

    if (simError) throw simError;

    // Get latest comparison
    const { data: comparison, error: compError } = await supabaseAdmin
      .from('branch_comparisons')
      .select('*')
      .eq('tree_id', tree.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (compError) throw compError;

    return NextResponse.json({
      tree,
      nodes: nodes ?? [],
      edges: edges ?? [],
      simulations: simulations ?? [],
      latest_comparison: comparison ?? null,
    });
  } catch (err) {
    console.error('[API] Decision tree get failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get tree' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await resolveUserId(clerkId);

    const body = await req.json();
    const { name, description } = body;

    const tree = await createDecisionTreeForDecision({
      userId,
      decisionId: params.id,
      name,
      description,
    });

    return NextResponse.json({ tree });
  } catch (err) {
    console.error('[API] Decision tree creation failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create tree' },
      { status: 500 }
    );
  }
}


