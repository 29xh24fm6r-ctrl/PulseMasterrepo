// Third Brain Graph v4 - Graph Query Engine
// lib/thirdbrain/graph/query.ts

import { supabaseAdmin } from '@/lib/supabase';
import { KnowledgeNode, KnowledgeEdge, GraphQueryResult, NodeKind } from './types';

export async function getEgoNetwork(params: {
  userId: string;
  nodeId: string;
  depth?: number;
  limit?: number;
}): Promise<GraphQueryResult> {
  const { userId, nodeId, depth = 2, limit = 50 } = params;

  const visited = new Set<string>([nodeId]);
  const nodes = new Map<string, KnowledgeNode>();
  const edges = new Map<string, KnowledgeEdge>();

  // Get the center node
  const { data: centerNode } = await supabaseAdmin
    .from('knowledge_nodes')
    .select('*')
    .eq('id', nodeId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!centerNode) {
    return { nodes: [], edges: [] };
  }

  nodes.set(centerNode.id, centerNode);

  // BFS traversal
  let currentLevel = [nodeId];
  let currentDepth = 0;

  while (currentDepth < depth && currentLevel.length > 0 && nodes.size < limit) {
    const nextLevel: string[] = [];

    // Get all edges from current level nodes
    const { data: levelEdges } = await supabaseAdmin
      .from('knowledge_edges')
      .select('*')
      .eq('user_id', userId)
      .in('from_node_id', currentLevel)
      .order('weight', { ascending: false })
      .limit(limit * 2);

    if (levelEdges) {
      for (const edge of levelEdges) {
        if (edges.has(edge.id)) continue;

        edges.set(edge.id, edge);

        // Add target node if not visited
        if (!visited.has(edge.to_node_id)) {
          visited.add(edge.to_node_id);
          nextLevel.push(edge.to_node_id);
        }
      }
    }

    // Also check reverse edges (for undirected or bidirectional)
    const { data: reverseEdges } = await supabaseAdmin
      .from('knowledge_edges')
      .select('*')
      .eq('user_id', userId)
      .in('to_node_id', currentLevel)
      .order('weight', { ascending: false })
      .limit(limit * 2);

    if (reverseEdges) {
      for (const edge of reverseEdges) {
        if (edges.has(edge.id)) continue;

        edges.set(edge.id, edge);

        if (!visited.has(edge.from_node_id)) {
          visited.add(edge.from_node_id);
          nextLevel.push(edge.from_node_id);
        }
      }
    }

    // Fetch nodes for next level
    if (nextLevel.length > 0) {
      const { data: nextNodes } = await supabaseAdmin
        .from('knowledge_nodes')
        .select('*')
        .eq('user_id', userId)
        .in('id', nextLevel)
        .limit(limit - nodes.size);

      if (nextNodes) {
        for (const node of nextNodes) {
          nodes.set(node.id, node);
        }
      }
    }

    currentLevel = nextLevel;
    currentDepth++;
  }

  return {
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values()),
  };
}

export async function searchGraph(params: {
  userId: string;
  query: string;
  kindFilter?: NodeKind[];
  limit?: number;
}): Promise<GraphQueryResult> {
  const { userId, query, kindFilter, limit = 20 } = params;

  let nodesQuery = supabaseAdmin
    .from('knowledge_nodes')
    .select('*')
    .eq('user_id', userId)
    .or(`title.ilike.%${query}%,summary.ilike.%${query}%`);

  if (kindFilter && kindFilter.length > 0) {
    nodesQuery = nodesQuery.in('kind', kindFilter);
  }

  nodesQuery = nodesQuery.order('importance', { ascending: false }).limit(limit);

  const { data: nodes } = await nodesQuery;

  if (!nodes || nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodeIds = nodes.map((n) => n.id);

  // Get edges between found nodes
  const { data: edges } = await supabaseAdmin
    .from('knowledge_edges')
    .select('*')
    .eq('user_id', userId)
    .in('from_node_id', nodeIds)
    .in('to_node_id', nodeIds);

  return {
    nodes: nodes ?? [],
    edges: edges ?? [],
  };
}

export async function getTopNodesByImportance(params: {
  userId: string;
  kindFilter?: NodeKind[];
  limit?: number;
}): Promise<KnowledgeNode[]> {
  const { userId, kindFilter, limit = 20 } = params;

  let query = supabaseAdmin
    .from('knowledge_nodes')
    .select('*')
    .eq('user_id', userId)
    .order('importance', { ascending: false })
    .order('last_touched_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (kindFilter && kindFilter.length > 0) {
    query = query.in('kind', kindFilter);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
}

/**
 * Find similar emotion episodes (stub implementation)
 * TODO: implement real similarity search against third brain graph / embeddings
 */
export async function findSimilarEmotionEpisodes(
  userId: string,
  episodeId: string,
  limit: number = 3
): Promise<any[]> {
  try {
    // Resolve userId to dbUserId if needed
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();

    const dbUserId = userRow?.id || userId;

    // Query similar emotion episodes from tb_nodes
    // For now, just return episodes of the same type, excluding the current one
    const { data } = await supabaseAdmin
      .from('tb_nodes')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('type', 'emotion_state')
      .neq('id', episodeId)
      .order('started_at', { ascending: false })
      .limit(limit);

    return data || [];
  } catch (err) {
    console.error("[findSimilarEmotionEpisodes] Error:", err);
    return [];
  }
}

/**
 * Find past events with a specific tag (stub implementation)
 * TODO: implement real tag search
 */
export async function findPastEventsWithTag(args: {
  userId: string;
  tag: string;
  limit?: number;
}): Promise<any[]> {
  try {
    const { userId, tag, limit = 20 } = args;

    // Resolve userId to dbUserId if needed
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();

    const dbUserId = userRow?.id || userId;

    // Query events/nodes that contain the tag
    // This is a basic implementation - adjust based on your actual schema
    const { data } = await supabaseAdmin
      .from('tb_nodes')
      .select('*')
      .eq('user_id', dbUserId)
      .contains('tags', [tag])
      .order('started_at', { ascending: false })
      .limit(limit);

    return data || [];
  } catch (err) {
    console.error("[findPastEventsWithTag] Error:", err);
    return [];
  }
}
