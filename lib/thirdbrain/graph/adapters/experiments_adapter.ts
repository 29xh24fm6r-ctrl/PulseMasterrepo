// Experiments Adapter - Sync experiments to graph
// lib/thirdbrain/graph/adapters/experiments_adapter.ts

import { supabaseAdmin } from '@/lib/supabase';
import { createNode, getNodeBySource } from '../service';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function syncExperimentToGraph(userId: string, experimentId: string): Promise<void> {
  const dbUserId = await resolveUserId(userId);

  // Get experiment
  const { data: experiment } = await supabaseAdmin
    .from('user_experiments')
    .select('*, user_experiment_results(*)')
    .eq('id', experimentId)
    .single();

  if (!experiment) return;

  const result = (experiment as any).user_experiment_results?.[0];

  // Check if node exists
  let existingNode = await getNodeBySource(userId, 'user_experiments', experimentId);
  if (existingNode) {
    return; // Already synced
  }

  // Create experiment node
  await createNode({
    userId,
    type: 'experiment',
    sourceTable: 'user_experiments',
    sourceId: experimentId,
    props: {
      name: experiment.name,
      domain: experiment.domain,
      hypothesis: experiment.hypothesis,
      recommendation: result?.summary?.recommendation || 'inconclusive',
    },
    startedAt: experiment.start_date,
    endedAt: experiment.end_date,
  });
}


