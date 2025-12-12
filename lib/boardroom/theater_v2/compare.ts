// Decision Theater v2 - Branch Comparison Engine
// lib/boardroom/theater_v2/compare.ts

import { supabaseAdminClient } from '../../../supabase/admin';
import { callAIJson } from '@/lib/ai/call';
import { BranchComparison } from './types';

export async function compareBranches(params: {
  treeId: string;
  runIds?: string[];
}): Promise<BranchComparison> {
  const { treeId, runIds } = params;

  // 1. Load relevant runs
  let runs;
  if (runIds && runIds.length > 0) {
    const { data } = await supabaseAdminClient
      .from('branch_simulation_runs')
      .select('*')
      .in('id', runIds)
      .eq('tree_id', treeId);

    runs = data ?? [];
  } else {
    // Get most recent runs for tree
    const { data } = await supabaseAdminClient
      .from('branch_simulation_runs')
      .select('*')
      .eq('tree_id', treeId)
      .order('run_at', { ascending: false })
      .limit(5);

    runs = data ?? [];
  }

  if (runs.length === 0) {
    throw new Error('No simulation runs found to compare');
  }

  // 2. Get node labels for context
  const allNodeIds = new Set<string>();
  for (const run of runs) {
    for (const nodeId of run.path_node_ids) {
      allNodeIds.add(nodeId);
    }
  }

  const { data: nodes } = await supabaseAdminClient
    .from('decision_tree_nodes')
    .select('id, label')
    .in('id', Array.from(allNodeIds));

  const nodeMap = new Map(nodes?.map((n) => [n.id, n.label]) ?? []);

  // 3. Build comparison context
  const runsContext = runs.map((run) => {
    const pathLabels = run.path_node_ids.map((id) => nodeMap.get(id) ?? 'Unknown');
    return {
      run_id: run.id,
      path: pathLabels.join(' → '),
      scores: run.scores,
      results: run.results,
      narrative: run.narrative_summary,
    };
  });

  // 4. Use LLM to generate comparison
  const comparisonPrompt = `Compare these decision paths:

${runsContext.map((r, i) => `Path ${i + 1} (${r.run_id}):
  Route: ${r.path}
  Scores: ${JSON.stringify(r.scores, null, 2)}
  Results: ${JSON.stringify(r.results, null, 2)}
  Narrative: ${r.narrative}`).join('\n\n')}

Provide:
1. A high-level summary comparing these paths
2. A recommendation for which path fits best and why
3. Key differences structured as: [{metric, winner_run_id, notes}]`;

  const result = await callAIJson<{
    summary: string;
    recommendation: string;
    key_differences: Array<{
      metric: string;
      winner_run_id: string;
      notes: string;
    }>;
  }>({
    userId: 'system', // Will need to get from tree
    feature: 'branch_comparison',
    systemPrompt: 'You are a decision comparison expert. Analyze multiple paths and provide clear recommendations.',
    userPrompt: comparisonPrompt,
    maxTokens: 1500,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    throw new Error('Failed to generate comparison');
  }

  const { summary, recommendation, key_differences } = result.data;

  // 5. Save comparison
  const { data: comparison, error } = await supabaseAdminClient
    .from('branch_comparisons')
    .insert({
      tree_id: treeId,
      compared_run_ids: runs.map((r) => r.id),
      summary,
      recommendation,
      key_differences: key_differences ?? [],
    })
    .select('*')
    .single();

  if (error) throw error;
  return comparison;
}


