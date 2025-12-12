// Decision Theater v2 - Tree Builder
// lib/boardroom/theater_v2/builder.ts

import { supabaseAdminClient } from '../../../supabase/admin';
import { DecisionTree, DecisionTreeNode, DecisionTreeEdge } from './types';

export async function createDecisionTreeForDecision(params: {
  userId: string;
  decisionId: string;
  name?: string;
  description?: string;
}): Promise<DecisionTree> {
  const { userId, decisionId, name, description } = params;

  // Get decision to infer name if not provided
  let treeName = name;
  if (!treeName) {
    const { data: decision } = await supabaseAdminClient
      .from('decisions')
      .select('title')
      .eq('id', decisionId)
      .maybeSingle();

    treeName = decision ? `${decision.title} – Multi-Stage` : 'Decision Tree';
  }

  const { data: tree, error } = await supabaseAdminClient
    .from('decision_trees')
    .insert({
      decision_id: decisionId,
      user_id: userId,
      name: treeName,
      description: description ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;

  // Create root node "Now"
  await supabaseAdminClient
    .from('decision_tree_nodes')
    .insert({
      tree_id: tree.id,
      user_id: userId,
      parent_node_id: null,
      depth: 0,
      label: 'Now',
      description: 'Current decision point',
    });

  return tree;
}

export async function addNodeToTree(params: {
  userId: string;
  treeId: string;
  parentNodeId?: string;
  label: string;
  description?: string;
  relatedDecisionOptionId?: string;
  relatedTimelineId?: string;
  pivotAtDate?: string;
}): Promise<DecisionTreeNode> {
  const { userId, treeId, parentNodeId, label, description, relatedDecisionOptionId, relatedTimelineId, pivotAtDate } = params;

  // Determine depth
  let depth = 0;
  if (parentNodeId) {
    const { data: parent } = await supabaseAdminClient
      .from('decision_tree_nodes')
      .select('depth')
      .eq('id', parentNodeId)
      .maybeSingle();

    if (parent) {
      depth = parent.depth + 1;
    }
  }

  const { data: node, error } = await supabaseAdminClient
    .from('decision_tree_nodes')
    .insert({
      tree_id: treeId,
      user_id: userId,
      parent_node_id: parentNodeId ?? null,
      depth,
      label,
      description: description ?? null,
      related_decision_option_id: relatedDecisionOptionId ?? null,
      related_timeline_id: relatedTimelineId ?? null,
      pivot_at_date: pivotAtDate ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return node;
}

export async function connectNodes(params: {
  userId: string;
  treeId: string;
  fromNodeId: string;
  toNodeId: string;
  label?: string;
  description?: string;
}): Promise<DecisionTreeEdge> {
  const { userId, treeId, fromNodeId, toNodeId, label, description } = params;

  if (fromNodeId === toNodeId) {
    throw new Error('Cannot connect node to itself');
  }

  // Check if edge already exists
  const { data: existing } = await supabaseAdminClient
    .from('decision_tree_edges')
    .select('*')
    .eq('tree_id', treeId)
    .eq('from_node_id', fromNodeId)
    .eq('to_node_id', toNodeId)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  const { data: edge, error } = await supabaseAdminClient
    .from('decision_tree_edges')
    .insert({
      tree_id: treeId,
      user_id: userId,
      from_node_id: fromNodeId,
      to_node_id: toNodeId,
      label: label ?? null,
      description: description ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return edge;
}

export async function createTwoStageTreeFromTimelines(params: {
  userId: string;
  decisionId: string;
  primaryTimelineId: string;
  alternateTimelineId: string;
}): Promise<DecisionTree> {
  const { userId, decisionId, primaryTimelineId, alternateTimelineId } = params;

  // Create tree
  const tree = await createDecisionTreeForDecision({
    userId,
    decisionId,
    name: 'Two-Stage Timeline Comparison',
  });

  // Get root node
  const { data: rootNode } = await supabaseAdminClient
    .from('decision_tree_nodes')
    .select('*')
    .eq('tree_id', tree.id)
    .eq('depth', 0)
    .maybeSingle();

  if (!rootNode) {
    throw new Error('Root node not found');
  }

  // Create child nodes for primary and alternate timelines
  const primaryNode = await addNodeToTree({
    userId,
    treeId: tree.id,
    parentNodeId: rootNode.id,
    label: 'Commit to Primary Timeline',
    relatedTimelineId: primaryTimelineId,
  });

  const alternateNode = await addNodeToTree({
    userId,
    treeId: tree.id,
    parentNodeId: rootNode.id,
    label: 'Commit to Alternate Timeline',
    relatedTimelineId: alternateTimelineId,
  });

  // Create pivot nodes (at 18 and 36 months)
  const now = new Date();
  const pivot18Months = new Date(now);
  pivot18Months.setMonth(pivot18Months.getMonth() + 18);
  const pivot36Months = new Date(now);
  pivot36Months.setMonth(pivot36Months.getMonth() + 36);

  // Primary → Alternate at 18 months
  await addNodeToTree({
    userId,
    treeId: tree.id,
    parentNodeId: primaryNode.id,
    label: 'Pivot to Alternate at 18 months',
    relatedTimelineId: alternateTimelineId,
    pivotAtDate: pivot18Months.toISOString().slice(0, 10),
  });

  // Primary → Alternate at 36 months
  await addNodeToTree({
    userId,
    treeId: tree.id,
    parentNodeId: primaryNode.id,
    label: 'Pivot to Alternate at 36 months',
    relatedTimelineId: alternateTimelineId,
    pivotAtDate: pivot36Months.toISOString().slice(0, 10),
  });

  // Alternate → Primary at 18 months
  await addNodeToTree({
    userId,
    treeId: tree.id,
    parentNodeId: alternateNode.id,
    label: 'Pivot to Primary at 18 months',
    relatedTimelineId: primaryTimelineId,
    pivotAtDate: pivot18Months.toISOString().slice(0, 10),
  });

  // Alternate → Primary at 36 months
  await addNodeToTree({
    userId,
    treeId: tree.id,
    parentNodeId: alternateNode.id,
    label: 'Pivot to Primary at 36 months',
    relatedTimelineId: primaryTimelineId,
    pivotAtDate: pivot36Months.toISOString().slice(0, 10),
  });

  // Connect edges
  await connectNodes({
    userId,
    treeId: tree.id,
    fromNodeId: rootNode.id,
    toNodeId: primaryNode.id,
    label: 'Choose Primary',
  });

  await connectNodes({
    userId,
    treeId: tree.id,
    fromNodeId: rootNode.id,
    toNodeId: alternateNode.id,
    label: 'Choose Alternate',
  });

  return tree;
}


