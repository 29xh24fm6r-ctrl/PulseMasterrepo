// Social Graph Types
// lib/social/types.ts

export interface SocialNode {
  userId: string;
  nodeType: 'self' | 'contact';
  nodeId: string;
  label?: string;
  roles?: string[];
  importanceScore?: number;
  lastInteractionAt?: Date;
}

export interface SocialEdge {
  userId: string;
  fromNodeType: 'self' | 'contact';
  fromNodeId: string;
  toNodeType: 'contact';
  toNodeId: string;
  relationshipType?: string;
  strength: number; // 0..1
  trust: number; // 0..1
  tension: number; // 0..1
  drift: number; // 0..1
  influence: number; // 0..1
  positivity: number; // 0..1
}

export interface SocialInsights {
  userId: string;
  summary?: string;
  topRelationships?: any[];
  driftWarnings?: any[];
  tensionHotspots?: any[];
  reachoutOpportunities?: any[];
}


