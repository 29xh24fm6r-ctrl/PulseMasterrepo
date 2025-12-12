// Social Graph Intelligence v2 Types
// lib/social/v2/types.ts

export interface SocialEntityInput {
  userId: string;
  source: string;
  externalId?: string;
  kind: 'person' | 'organization';
  displayName: string;
  roleLabel?: string;
  importance?: number;
  tags?: string[];
}

export interface SocialEdgeMetrics {
  lastContactDays?: number;
  messagesPerWeek?: number;
  callsPerMonth?: number;
  eventsSharedLast90d?: number;
}

export interface SocialEdgeState {
  relationshipType?: string;
  direction?: 'outbound' | 'inbound' | 'mutual';
  closeness?: number;
  trust?: number;
  tension?: number;
  drift?: number;
  supportiveness?: number;
  metrics?: SocialEdgeMetrics;
}


