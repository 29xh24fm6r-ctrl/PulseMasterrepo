// Third Brain Graph v4 - Graph Indexer
// lib/thirdbrain/graph/indexer.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';
import { KnowledgeNode, KnowledgeEdge, MemoryEvent, NodeKind, EdgeRelation } from './types';

export async function upsertNodeFromEntity(params: {
  userId: string;
  kind: NodeKind;
  externalRef?: string;
  title: string;
  summary?: string;
  tags?: string[];
}): Promise<KnowledgeNode> {
  const { userId, kind, externalRef, title, summary, tags } = params;

  // Check if node exists by external_ref
  let existingNode: KnowledgeNode | null = null;
  if (externalRef) {
    const { data } = await supabaseAdmin
      .from('knowledge_nodes')
      .select('*')
      .eq('user_id', userId)
      .eq('external_ref', externalRef)
      .maybeSingle();
    existingNode = data;
  }

  const now = new Date().toISOString();
  const nodeData = {
    user_id: userId,
    kind,
    external_ref: externalRef ?? null,
    title,
    summary: summary ?? null,
    tags: tags ?? [],
    last_touched_at: now,
  };

  if (existingNode) {
    // Update existing node
    const { data, error } = await supabaseAdmin
      .from('knowledge_nodes')
      .update({
        ...nodeData,
        updated_at: now,
      })
      .eq('id', existingNode.id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } else {
    // Create new node
    const { data, error } = await supabaseAdmin
      .from('knowledge_nodes')
      .insert(nodeData)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }
}

export async function linkNodes(params: {
  userId: string;
  fromNodeId: string;
  toNodeId: string;
  relation: EdgeRelation;
  weight?: number;
  direction?: 'directed' | 'undirected';
}): Promise<KnowledgeEdge> {
  const { userId, fromNodeId, toNodeId, relation, weight = 1.0, direction = 'directed' } = params;

  if (fromNodeId === toNodeId) {
    throw new Error('Cannot link node to itself');
  }

  // Check if edge already exists
  const { data: existing } = await supabaseAdmin
    .from('knowledge_edges')
    .select('*')
    .eq('user_id', userId)
    .eq('from_node_id', fromNodeId)
    .eq('to_node_id', toNodeId)
    .eq('relation', relation)
    .maybeSingle();

  if (existing) {
    // Update weight
    const { data, error } = await supabaseAdmin
      .from('knowledge_edges')
      .update({ weight })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  // Create new edge
  const { data, error } = await supabaseAdmin
    .from('knowledge_edges')
    .insert({
      user_id: userId,
      from_node_id: fromNodeId,
      to_node_id: toNodeId,
      relation,
      weight,
      direction,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function recordMemoryEvent(params: {
  userId: string;
  nodeId?: string;
  contextId?: string;
  source: MemoryEvent['source'];
  action: MemoryEvent['action'];
  weight?: number;
  occurredAt?: Date;
}): Promise<void> {
  const { userId, nodeId, contextId, source, action, weight = 1.0, occurredAt } = params;

  await supabaseAdmin
    .from('memory_events')
    .insert({
      user_id: userId,
      node_id: nodeId ?? null,
      context_id: contextId ?? null,
      source,
      action,
      weight,
      occurred_at: occurredAt?.toISOString() ?? new Date().toISOString(),
    });

  // Update node's last_touched_at if nodeId provided
  if (nodeId) {
    await supabaseAdmin
      .from('knowledge_nodes')
      .update({ last_touched_at: new Date().toISOString() })
      .eq('id', nodeId);
  }
}

export async function recomputeNodeImportance(userId: string, nodeId: string): Promise<void> {
  // Get all memory events for this node in last 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const ninetyDaysAgoStr = ninetyDaysAgo.toISOString();

  const { data: events } = await supabaseAdmin
    .from('memory_events')
    .select('weight, occurred_at')
    .eq('user_id', userId)
    .eq('node_id', nodeId)
    .gte('occurred_at', ninetyDaysAgoStr)
    .order('occurred_at', { ascending: false });

  if (!events || events.length === 0) {
    // No recent activity, decay importance
    await supabaseAdmin
      .from('knowledge_nodes')
      .update({ importance: 0.0 })
      .eq('id', nodeId);
    return;
  }

  // Compute importance: sum of weights with time decay
  let totalImportance = 0;
  const now = Date.now();

  for (const event of events) {
    const eventTime = new Date(event.occurred_at).getTime();
    const daysAgo = (now - eventTime) / (1000 * 60 * 60 * 24);
    const decayFactor = Math.exp(-daysAgo / 30); // Half-life of 30 days
    totalImportance += event.weight * decayFactor;
  }

  // Normalize to 0-10 scale (cap at 10)
  const importance = Math.min(totalImportance / 10, 10);

  await supabaseAdmin
    .from('knowledge_nodes')
    .update({ importance: Math.round(importance * 100) / 100 })
    .eq('id', nodeId);
}

export async function recomputeAllNodeImportances(userId: string): Promise<void> {
  const { data: nodes } = await supabaseAdmin
    .from('knowledge_nodes')
    .select('id')
    .eq('user_id', userId);

  if (!nodes) return;

  // Process in batches to avoid overwhelming the database
  const batchSize = 50;
  for (let i = 0; i < nodes.length; i += batchSize) {
    const batch = nodes.slice(i, i + batchSize);
    await Promise.all(batch.map((node) => recomputeNodeImportance(userId, node.id)));
  }
}


