// Social Graph Opportunity Detector
// lib/relationships/social-graph/opportunity-detector.ts

import { SocialGraph, SocialGraphNode, SocialGraphInsight } from "./types";

/**
 * Detect opportunities in social graph
 */
export function detectOpportunities(graph: SocialGraph): SocialGraphInsight[] {
  const opportunities: SocialGraphInsight[] = [];

  // Rising connections (opportunity score increasing)
  for (const node of graph.nodes) {
    if (node.opportunity > 70) {
      opportunities.push({
        type: "opportunity_window",
        nodeId: node.id,
        nodeName: node.name,
        description: `High-opportunity window with ${node.name} (${node.opportunity} opportunity score)`,
        priority: node.opportunity > 80 ? "high" : "medium",
        recommendedAction: `Initiate reconnection or deepen connection with ${node.name}`,
        metadata: {
          opportunityScore: node.opportunity,
          daysSince: node.daysSinceInteraction,
          relationshipScore: node.relationshipScore,
        },
      });
    }
  }

  // Milestone opportunities (would need calendar integration)
  // Placeholder for birthday, promotion, etc.

  // High-value moments (recent interactions with high-value relationships)
  const recentHighValue = graph.nodes.filter(
    (n) => n.daysSinceInteraction < 7 && n.relationshipScore > 70
  );
  for (const node of recentHighValue.slice(0, 3)) {
    opportunities.push({
      type: "rising_connection",
      nodeId: node.id,
      nodeName: node.name,
      description: `Active high-value relationship with ${node.name}. Good time to deepen.`,
      priority: "medium",
      recommendedAction: `Strengthen connection with ${node.name} through meaningful interaction`,
      metadata: {
        relationshipScore: node.relationshipScore,
        daysSince: node.daysSinceInteraction,
      },
    });
  }

  return opportunities;
}



