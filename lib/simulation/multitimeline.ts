// Multi-Timeline Simulation Layer v1
// lib/simulation/multitimeline.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';
import { callAI } from '@/lib/ai/call';
import { BranchSimulationRun } from '../boardroom/theater_v2/types';
import { getTreePaths } from '../boardroom/theater_v2/paths';

export async function runBranchSimulations(params: {
  userId: string;
  treeId: string;
  maxPaths?: number;
}): Promise<BranchSimulationRun[]> {
  const { userId, treeId, maxPaths = 10 } = params;

  // 1. Get all paths
  const paths = await getTreePaths({ treeId, maxPaths });

  if (paths.length === 0) {
    return [];
  }

  const runs: BranchSimulationRun[] = [];

  for (const path of paths) {
    // 2. Get nodes in path
    const { data: pathNodes } = await supabaseAdmin
      .from('decision_tree_nodes')
      .select('*')
      .in('id', path.pathNodeIds)
      .order('depth', { ascending: true });

    if (!pathNodes || pathNodes.length === 0) {
      continue;
    }

    // 3. Build simulation stages
    const stages: Array<{
      timelineId: string | null;
      startOffsetMonths: number;
      endOffsetMonths: number;
      nodeLabel: string;
    }> = [];

    let currentOffsetMonths = 0;

    for (let i = 0; i < pathNodes.length - 1; i++) {
      const currentNode = pathNodes[i];
      const nextNode = pathNodes[i + 1];

      // Calculate duration to next node
      let durationMonths = 18; // Default
      if (nextNode.pivot_at_date) {
        const pivotDate = new Date(nextNode.pivot_at_date);
        const now = new Date();
        durationMonths = (pivotDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
      } else if (i === 0) {
        // First stage: use timeline horizon or default
        if (currentNode.related_timeline_id) {
          const { data: timeline } = await supabaseAdmin
            .from('destiny_timelines')
            .select('time_horizon_years')
            .eq('id', currentNode.related_timeline_id)
            .maybeSingle();

          if (timeline?.time_horizon_years) {
            durationMonths = timeline.time_horizon_years * 12;
          }
        }
      }

      stages.push({
        timelineId: currentNode.related_timeline_id,
        startOffsetMonths: currentOffsetMonths,
        endOffsetMonths: currentOffsetMonths + durationMonths,
        nodeLabel: currentNode.label,
      });

      currentOffsetMonths += durationMonths;
    }

    // 4. Build parameters
    const parameters = {
      stages,
      path_labels: pathNodes.map((n) => n.label),
    };

    // 5. Placeholder for Life Simulation call
    // In a full implementation, this would call the Life Simulation Engine
    const simResult = {
      financial_trajectory: 'stable',
      cash_at_end: 100000,
      stress_risk: 'moderate',
      relationship_impact: 'neutral',
      creative_expression: 'moderate',
      work_life_balance: 'moderate',
    };

    // 6. Compute scores
    const scores = {
      risk: 5.0, // Placeholder
      upside: 7.0,
      downside: 3.0,
      regret_risk: 4.0,
      resilience: 6.0,
      alignment: 7.0,
    };

    // 7. Generate narrative summary
    const narrativePrompt = `Path: ${pathNodes.map((n) => n.label).join(' → ')}
Stages: ${JSON.stringify(stages, null, 2)}
Simulation Results: ${JSON.stringify(simResult, null, 2)}

Generate a 2-3 sentence narrative summary describing what this path would feel like in practice.`;

    const narrativeResult = await callAI({
      userId,
      feature: 'branch_simulation_narrative',
      systemPrompt: 'You are a narrative generator for decision paths. Describe what living this path would feel like.',
      userPrompt: narrativePrompt,
      maxTokens: 300,
      temperature: 0.7,
    });

    const narrativeSummary = narrativeResult.success && narrativeResult.content
      ? narrativeResult.content
      : `Path: ${pathNodes.map((n) => n.label).join(' → ')}`;

    // 8. Save branch simulation run
    const { data: run, error } = await supabaseAdmin
      .from('branch_simulation_runs')
      .insert({
        tree_id: treeId,
        root_node_id: path.rootNodeId,
        leaf_node_id: path.leafNodeId,
        path_node_ids: path.pathNodeIds,
        run_at: new Date().toISOString(),
        parameters,
        results: simResult,
        narrative_summary: narrativeSummary,
        scores,
      })
      .select('*')
      .single();

    if (error) {
      console.error(`Failed to save simulation run for path`, error);
      continue;
    }

    if (run) {
      runs.push(run);
    }
  }

  return runs;
}


