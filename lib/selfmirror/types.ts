// Global Sense of Self Mirror v1 - Types
// lib/selfmirror/types.ts

export type SelfMirrorMode = 'daily_glance' | 'weekly_debrief' | 'identity_deep_dive' | 'crucible_review';

export type SignalCategory = 'followthrough' | 'overload' | 'avoidance' | 'risk_taking' | 'caregiving' | 'learning' | 'relationship_nourishment' | 'replenishment';

export type SignalDirection = 'supports_identity' | 'conflicts_identity' | 'neutral';

export type SignalSource = 'calendar' | 'tasks' | 'deals' | 'habits' | 'relationships' | 'finance' | 'emotion_os' | 'civilization';

export type SnapshotSource = 'system' | 'mirror_session' | 'weekly' | 'manual';

export interface SelfIdentitySnapshot {
  id: string;
  user_id: string;
  taken_at: string;
  source: SnapshotSource;
  roles: string[] | null;
  values: string[] | null;
  strengths: string[] | null;
  vulnerabilities: string[] | null;
  self_story: string | null;
  mythic_archetypes: any | null;
  domain_balance: any | null;
  overall_self_alignment: number | null;
  created_at: string;
}

export interface SelfPerceptionSignal {
  id: string;
  user_id: string;
  source: SignalSource;
  category: SignalCategory;
  direction: SignalDirection;
  weight: number;
  description: string | null;
  occurred_at: string;
  created_at: string;
}

export interface SelfMirrorFacet {
  id: string;
  user_id: string;
  key: string;
  name: string;
  description: string | null;
  score: number | null;
  trend: 'up' | 'down' | 'flat' | 'unknown' | null;
  last_updated_at: string;
  created_at: string;
}

export interface SelfMirrorSession {
  id: string;
  user_id: string;
  mode: SelfMirrorMode;
  started_at: string;
  completed_at: string | null;
  snapshot_id: string | null;
  script: string | null;
  summary: string | null;
  insights: any | null;
  followup_actions: any | null;
  created_at: string;
}


