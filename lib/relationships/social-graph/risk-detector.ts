// Social Graph Risk Detector
// lib/relationships/social-graph/risk-detector.ts

import { SocialGraph, SocialGraphNode, SocialGraphInsight } from "./types";

/**
 * Detect risks in social graph
 */
export function detectRisks(graph: SocialGraph): SocialGraphInsight[] {
  const risks: SocialGraphInsight[] = [];

  // Declining relationships
  for (const node of graph.nodes) {
    if (node.risk > 70) {
      risks.push({
        type: "risk_alert",
        nodeId: node.id,
        nodeName: node.name,
        description: `High-risk relationship: ${node.name} (${node.risk} risk score, ${node.drift} drift)`,
        priority: node.risk > 80 ? "high" : "medium",
        recommendedAction: `Take immediate action to reconnect with ${node.name}`,
        metadata: {
          riskScore: node.risk,
          driftScore: node.drift,
          daysSince: node.daysSinceInteraction,
          relationshipScore: node.relationshipScore,
        },
      });
    }
  }

  // Neglect markers (high drift, high relationship score)
  const neglectedHighValue = graph.nodes.filter(
    (n) => n.drift > 60 && n.relationshipScore > 70
  );
  for (const node of neglectedHighValue.slice(0, 5)) {
    risks.push({
      type: "declining_relationship",
      nodeId: node.id,
      nodeName: node.name,
      description: `High-value relationship ${node.name} is drifting (${node.drift} drift score)`,
      priority: "high",
      recommendedAction: `Initiate repair sequence for ${node.name}`,
      metadata: {
        driftScore: node.drift,
        relationshipScore: node.relationshipScore,
        daysSince: node.daysSinceInteraction,
      },
    });
  }

  // Sentiment decay (would need sentiment analysis)
  // Placeholder for future enhancement

  return risks;
}



