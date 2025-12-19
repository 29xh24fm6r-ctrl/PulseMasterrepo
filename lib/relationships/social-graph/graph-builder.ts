// Social Graph Builder v1
// lib/relationships/social-graph/graph-builder.ts

import { supabaseAdmin } from "@/lib/supabase";
import { SocialGraph, SocialGraphNode, SocialGraphEdge, SocialNodeCategory } from "./types";

// Local type alias to match usage pattern
export type PulseCortexContext = {
  domains?: {
    relationships?: {
      keyPeople?: Array<{
        id: string;
        name: string;
        relationshipScore: number;
        daysSinceInteraction: number;
        lastInteractionAt?: string;
      }>;
    };
  };
};

/**
 * Build complete social graph
 */
export async function buildSocialGraph(
  userId: string,
  ctx: PulseCortexContext
): Promise<SocialGraph> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  // Build nodes from relationships
  const nodes = await buildGraphNodes(dbUserId, ctx);

  // Build edges (connections between nodes)
  const edges = buildGraphEdges(nodes, ctx);

  // Detect clusters
  const clusters = detectClusters(nodes, edges);

  return {
    nodes,
    edges,
    clusters,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Build graph nodes from relationships
 */
async function buildGraphNodes(
  dbUserId: string,
  ctx: PulseCortexContext
): Promise<SocialGraphNode[]> {
  const nodes: SocialGraphNode[] = [];

  // Get relationships from domain context
  const relationships = ctx.domains?.relationships?.keyPeople || [];

  for (const person of relationships) {
    // Determine category (simplified - would need more data)
    let category: SocialNodeCategory = "friend";
    if (person.relationshipScore > 80) {
      category = "work"; // High score might indicate work relationship
    } else if (person.relationshipScore > 60) {
      category = "network";
    }

    // Calculate drift
    const drift = calculateDrift(person.daysSinceInteraction, person.relationshipScore);

    // Calculate opportunity
    const opportunity = calculateOpportunity(person.daysSinceInteraction, person.relationshipScore);

    // Calculate risk
    const risk = calculateRisk(person.daysSinceInteraction, person.relationshipScore);

    nodes.push({
      id: person.id,
      name: person.name,
      category,
      strength: person.relationshipScore,
      drift,
      opportunity,
      risk,
      lastInteraction: person.lastInteractionAt,
      daysSinceInteraction: person.daysSinceInteraction,
      relationshipScore: person.relationshipScore,
      metadata: {
        interactionFrequency: inferFrequency(person.daysSinceInteraction),
      },
    });
  }

  return nodes;
}

/**
 * Build graph edges (connections between nodes)
 */
function buildGraphEdges(
  nodes: SocialGraphNode[],
  ctx: PulseCortexContext
): SocialGraphEdge[] {
  const edges: SocialGraphEdge[] = [];

  // Simple edge inference: nodes in same domain category are connected
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];

      // Same category = potential connection
      if (nodeA.category === nodeB.category) {
        const weight = calculateEdgeWeight(nodeA, nodeB);
        if (weight > 0.3) {
          edges.push({
            from: nodeA.id,
            to: nodeB.id,
            weight,
            type: "domain_overlap",
            metadata: {
              sharedCategory: nodeA.category,
            },
          });
        }
      }

      // Similar relationship scores = potential connection
      const scoreDiff = Math.abs(nodeA.relationshipScore - nodeB.relationshipScore);
      if (scoreDiff < 20) {
        const weight = 1 - scoreDiff / 100;
        if (weight > 0.4) {
          edges.push({
            from: nodeA.id,
            to: nodeB.id,
            weight,
            type: "pattern_linked",
            metadata: {
              similarStrength: true,
            },
          });
        }
      }
    }
  }

  return edges;
}

/**
 * Calculate drift score
 */
function calculateDrift(daysSince: number, relationshipScore: number): number {
  // Higher drift if high-value relationship + long time since contact
  if (relationshipScore > 70 && daysSince > 30) return 80;
  if (relationshipScore > 50 && daysSince > 60) return 60;
  if (daysSince > 90) return 70;
  return Math.min(50, daysSince / 2);
}

/**
 * Calculate opportunity score
 */
function calculateOpportunity(daysSince: number, relationshipScore: number): number {
  // Reconnection window (30-60 days)
  if (daysSince > 30 && daysSince < 60 && relationshipScore > 60) return 80;
  // Active relationship
  if (daysSince < 14 && relationshipScore > 70) return 70;
  // Long-term reconnection
  if (daysSince > 60 && relationshipScore > 50) return 50;
  return 30;
}

/**
 * Calculate risk score
 */
function calculateRisk(daysSince: number, relationshipScore: number): number {
  // High risk: important relationship + long silence
  if (relationshipScore > 70 && daysSince > 30) return 80;
  if (relationshipScore > 50 && daysSince > 60) return 60;
  if (daysSince > 90) return 70;
  return Math.min(40, daysSince / 3);
}

/**
 * Infer interaction frequency
 */
function inferFrequency(daysSince: number): string {
  if (daysSince <= 1) return "daily";
  if (daysSince <= 7) return "weekly";
  if (daysSince <= 30) return "monthly";
  if (daysSince <= 90) return "quarterly";
  return "irregular";
}

/**
 * Calculate edge weight between two nodes
 */
function calculateEdgeWeight(nodeA: SocialGraphNode, nodeB: SocialGraphNode): number {
  let weight = 0.5; // Base weight for same category

  // Adjust based on strength similarity
  const strengthDiff = Math.abs(nodeA.strength - nodeB.strength);
  weight += (1 - strengthDiff / 100) * 0.3;

  // Adjust based on drift similarity
  const driftDiff = Math.abs(nodeA.drift - nodeB.drift);
  weight += (1 - driftDiff / 100) * 0.2;

  return Math.min(1.0, weight);
}

/**
 * Detect clusters in the graph
 */
function detectClusters(
  nodes: SocialGraphNode[],
  edges: SocialGraphEdge[]
): SocialGraph["clusters"] {
  const clusters: SocialGraph["clusters"] = [];

  // Group by category
  const categoryGroups = new Map<SocialNodeCategory, SocialGraphNode[]>();
  for (const node of nodes) {
    if (!categoryGroups.has(node.category)) {
      categoryGroups.set(node.category, []);
    }
    categoryGroups.get(node.category)!.push(node);
  }

  // Create clusters for each category with 3+ nodes
  for (const [category, categoryNodes] of categoryGroups.entries()) {
    if (categoryNodes.length >= 3) {
      const avgStrength =
        categoryNodes.reduce((sum, n) => sum + n.strength, 0) / categoryNodes.length;
      const avgDrift =
        categoryNodes.reduce((sum, n) => sum + n.drift, 0) / categoryNodes.length;

      clusters.push({
        id: `cluster_${category}`,
        name: `${category.charAt(0).toUpperCase() + category.slice(1)} Network`,
        nodes: categoryNodes.map((n) => n.id),
        category,
        averageStrength: avgStrength,
        averageDrift: avgDrift,
      });
    }
  }

  return clusters;
}
