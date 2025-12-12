// Graph API Helpers
// lib/graph/api.ts

import { supabaseAdmin } from "@/lib/supabase";

export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  topNodeTypes: Array<{
    type: string;
    count: number;
  }>;
}

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  subtype?: string;
  updatedAt?: string;
}

export interface GraphNodeDetails {
  id: string;
  type: string;
  label: string;
  subtype?: string;
  description?: string;
  properties: Record<string, any>;
  tags?: string[];
}

export interface GraphNeighbor {
  id: string;
  type: string;
  label: string;
  relation: string;
}

export interface GraphNeighborhood {
  center: {
    id: string;
    type: string;
    label: string;
  };
  neighbors: GraphNeighbor[];
}

export interface GraphInsight {
  type: string;
  title: string;
  body: string;
}

/**
 * Get graph statistics
 */
export async function getGraphStats(userId: string): Promise<GraphStats> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Check if Intelligence Graph tables exist
  const { data: nodesTableExists } = await supabaseAdmin
    .from("intelligence_graph_nodes")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (!nodesTableExists) {
    // Graph not yet implemented - return empty stats
    return {
      nodeCount: 0,
      edgeCount: 0,
      topNodeTypes: [],
    };
  }

  // Count nodes
  const { count: nodeCount } = await supabaseAdmin
    .from("intelligence_graph_nodes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", dbUserId);

  // Count edges
  const { count: edgeCount } = await supabaseAdmin
    .from("intelligence_graph_edges")
    .select("*", { count: "exact", head: true })
    .eq("user_id", dbUserId);

  // Get top node types
  const { data: nodes } = await supabaseAdmin
    .from("intelligence_graph_nodes")
    .select("node_type")
    .eq("user_id", dbUserId);

  const typeCounts: Record<string, number> = {};
  (nodes || []).forEach((node) => {
    typeCounts[node.node_type] = (typeCounts[node.node_type] || 0) + 1;
  });

  const topNodeTypes = Object.entries(typeCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    nodeCount: nodeCount || 0,
    edgeCount: edgeCount || 0,
    topNodeTypes,
  };
}

/**
 * Get nodes by type
 */
export async function getNodesByType(
  userId: string,
  type?: string,
  search?: string
): Promise<GraphNode[]> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Check if Intelligence Graph tables exist
  const { data: nodesTableExists } = await supabaseAdmin
    .from("intelligence_graph_nodes")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (!nodesTableExists) {
    return [];
  }

  let query = supabaseAdmin
    .from("intelligence_graph_nodes")
    .select("*")
    .eq("user_id", dbUserId)
    .order("created_at", { ascending: false });

  if (type && type !== "all") {
    query = query.eq("node_type", type);
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,metadata->>label.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch nodes: ${error.message}`);

  return (data || []).map((node) => ({
    id: node.id,
    type: node.node_type,
    label: node.title || node.metadata?.label || node.node_id || "Unnamed",
    subtype: node.metadata?.subtype,
    updatedAt: node.updated_at || node.created_at,
  }));
}

/**
 * Get node details
 */
export async function getNodeDetails(userId: string, nodeId: string): Promise<GraphNodeDetails | null> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const { data, error } = await supabaseAdmin
    .from("intelligence_graph_nodes")
    .select("*")
    .eq("id", nodeId)
    .eq("user_id", dbUserId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    type: data.node_type,
    label: data.title || data.metadata?.label || data.node_id || "Unnamed",
    subtype: data.metadata?.subtype,
    description: data.metadata?.description || data.description,
    properties: data.metadata || {},
    tags: data.metadata?.tags || [],
  };
}

/**
 * Get neighborhood for a node
 */
export async function getNeighborhood(
  userId: string,
  nodeId: string
): Promise<GraphNeighborhood | null> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Get center node
  const center = await getNodeDetails(userId, nodeId);
  if (!center) return null;

  // Get edges connected to this node
  const { data: edges } = await supabaseAdmin
    .from("intelligence_graph_edges")
    .select("*")
    .eq("user_id", dbUserId)
    .or(`source_id.eq.${nodeId},target_id.eq.${nodeId}`)
    .limit(20);

  if (!edges) {
    return {
      center: {
        id: center.id,
        type: center.type,
        label: center.label,
      },
      neighbors: [],
    };
  }

  if (!edges || edges.length === 0) {
    return {
      center: {
        id: center.id,
        type: center.type,
        label: center.label,
      },
      neighbors: [],
    };
  }

  // Get neighbor nodes
  const neighborIds = new Set<string>();
  edges.forEach((edge) => {
    if (edge.source_id === nodeId) neighborIds.add(edge.target_id);
    if (edge.target_id === nodeId) neighborIds.add(edge.source_id);
  });

  const { data: neighborNodes } = await supabaseAdmin
    .from("intelligence_graph_nodes")
    .select("*")
    .eq("user_id", dbUserId)
    .in("id", Array.from(neighborIds));

  const neighbors: GraphNeighbor[] = (neighborNodes || []).map((node: any) => {
    // Find the edge connecting this neighbor
    const edge = edges.find(
      (e: any) => (e.source_id === nodeId && e.target_id === node.id) || (e.target_id === nodeId && e.source_id === node.id)
    );

    return {
      id: node.id,
      type: node.node_type,
      label: node.title || node.metadata?.label || node.node_id || "Unnamed",
      relation: edge?.edge_type || "related_to",
    };
  });

  return {
    center: {
      id: center.id,
      type: center.type,
      label: center.label,
    },
    neighbors: neighbors.slice(0, 10), // Limit to 10 neighbors
  };
}

/**
 * Get graph insights
 */
export async function getGraphInsights(userId: string): Promise<GraphInsight[]> {
  // For now, return placeholder insights
  // Later, this will use the Intelligence Graph Engine's insight generation
  try {
    // Try to get insights from Intelligence Graph if available
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Check if insights table exists
    const { data: insightsTableExists } = await supabaseAdmin
      .from("intelligence_graph_insights")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (insightsTableExists) {
      const { data } = await supabaseAdmin
        .from("intelligence_graph_insights")
        .select("*")
        .eq("user_id", dbUserId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (data) {
        return data.map((insight: any) => ({
          type: insight.category || "pattern",
          title: insight.title,
          body: insight.body,
        }));
      }
    }
  } catch (err) {
    // Insights not available
  }

  // Return empty array if no insights available
  return [];
}

