// Decision Theater v2 - Tree Details API
// app/api/boardroom/decision-trees/[treeId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdminClient } from '@/lib/supabase/admin';

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
  { params }: { params: { treeId: string } }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await resolveUserId(clerkId);

    // Get tree
    const { data: tree, error: treeError } = await supabaseAdminClient
      .from('decision_trees')
      .select('*')
      .eq('id', params.treeId)
      .eq('user_id', userId)
      .maybeSingle();

    if (treeError) throw treeError;
    if (!tree) {
      return NextResponse.json({ error: 'Tree not found' }, { status: 404 });
    }

    // Get nodes
    const { data: nodes, error: nodesError } = await supabaseAdminClient
      .from('decision_tree_nodes')
      .select('*')
      .eq('tree_id', params.treeId)
      .order('depth', { ascending: true });

    if (nodesError) throw nodesError;

    // Get edges
    const { data: edges, error: edgesError } = await supabaseAdminClient
      .from('decision_tree_edges')
      .select('*')
      .eq('tree_id', params.treeId);

    if (edgesError) throw edgesError;

    // Get latest simulations
    const { data: simulations, error: simError } = await supabaseAdminClient
      .from('branch_simulation_runs')
      .select('*')
      .eq('tree_id', params.treeId)
      .order('run_at', { ascending: false })
      .limit(10);

    if (simError) throw simError;

    // Get latest comparison
    const { data: comparison, error: compError } = await supabaseAdminClient
      .from('branch_comparisons')
      .select('*')
      .eq('tree_id', params.treeId)
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
    console.error('[API] Decision tree details failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch tree' },
      { status: 500 }
    );
  }
}


