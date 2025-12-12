// Social Graph Mapping Engine v1 Types
// lib/relationships/social-graph/types.ts

export type SocialNodeCategory =
  | "family"
  | "friend"
  | "partner"
  | "work"
  | "client"
  | "network"
  | "mentor"
  | "other";

export interface SocialGraphNode {
  id: string;
  name: string;
  category: SocialNodeCategory;
  strength: number; // 0-100, relationship strength
  drift: number; // 0-100, how much relationship is drifting
  opportunity: number; // 0-100, opportunity score
  risk: number; // 0-100, risk of relationship decline
  lastInteraction?: string;
  daysSinceInteraction: number;
  relationshipScore: number;
  metadata?: {
    sharedProjects?: string[];
    domainOverlap?: string[];
    interactionFrequency?: string;
    emotionalAssociation?: "positive" | "neutral" | "negative";
  };
}

export interface SocialGraphEdge {
  from: string; // Node ID
  to: string; // Node ID
  weight: number; // 0-1, connection strength
  type: "shared_project" | "domain_overlap" | "pattern_linked" | "direct_interaction";
  metadata?: Record<string, any>;
}

export interface SocialGraph {
  nodes: SocialGraphNode[];
  edges: SocialGraphEdge[];
  clusters?: SocialGraphCluster[];
  generatedAt: string;
}

export interface SocialGraphCluster {
  id: string;
  name: string;
  nodes: string[]; // Node IDs
  category: SocialNodeCategory;
  averageStrength: number;
  averageDrift: number;
}

export interface SocialGraphInsight {
  type: "rising_connection" | "declining_relationship" | "opportunity_window" | "risk_alert";
  nodeId: string;
  nodeName: string;
  description: string;
  priority: "low" | "medium" | "high";
  recommendedAction: string;
  metadata?: Record<string, any>;
}



