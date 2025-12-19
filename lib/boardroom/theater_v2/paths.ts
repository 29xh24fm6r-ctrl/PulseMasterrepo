// Decision Theater v2 - Path Extraction
// lib/boardroom/theater_v2/paths.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';
import { TreePath } from './types';

export async function getTreePaths(params: {
  treeId: string;
  maxDepth?: number;
  maxPaths?: number;
}): Promise<TreePath[]> {
  const { treeId, maxDepth = 10, maxPaths = 50 } = params;

  // Get all nodes
  const { data: nodes } = await supabaseAdmin
    .from('decision_tree_nodes')
    .select('*')
    .eq('tree_id', treeId)
    .order('depth', { ascending: true });

  if (!nodes || nodes.length === 0) {
    return [];
  }

  // Get all edges
  const { data: edges } = await supabaseAdmin
    .from('decision_tree_edges')
    .select('*')
    .eq('tree_id', treeId);

  // Build adjacency list
  const adjacency = new Map<string, string[]>();
  for (const edge of edges ?? []) {
    const existing = adjacency.get(edge.from_node_id) ?? [];
    existing.push(edge.to_node_id);
    adjacency.set(edge.from_node_id, existing);
  }

  // Find root node (depth 0, no parent)
  const rootNode = nodes.find((n) => n.depth === 0 && !n.parent_node_id);
  if (!rootNode) {
    return [];
  }

  // Find leaf nodes (nodes with no outgoing edges)
  const leafNodes = nodes.filter((n) => !adjacency.has(n.id));

  // BFS to find all paths from root to leaves
  const paths: TreePath[] = [];

  interface QueueItem {
    nodeId: string;
    path: string[];
  }

  const queue: QueueItem[] = [{ nodeId: rootNode.id, path: [rootNode.id] }];

  while (queue.length > 0 && paths.length < maxPaths) {
    const current = queue.shift()!;

    // If current is a leaf, save path
    if (leafNodes.some((l) => l.id === current.nodeId)) {
      paths.push({
        rootNodeId: rootNode.id,
        leafNodeId: current.nodeId,
        pathNodeIds: current.path,
      });
      continue;
    }

    // If path too deep, skip
    if (current.path.length > maxDepth) {
      continue;
    }

    // Add children to queue
    const children = adjacency.get(current.nodeId) ?? [];
    for (const childId of children) {
      // Avoid cycles
      if (current.path.includes(childId)) {
        continue;
      }
      queue.push({
        nodeId: childId,
        path: [...current.path, childId],
      });
    }
  }

  return paths;
}


