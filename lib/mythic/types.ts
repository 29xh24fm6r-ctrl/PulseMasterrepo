// Mythic Intelligence Layer v1 - Types
// lib/mythic/types.ts

export type MythicArchetypeKind = 'life' | 'deal' | 'power';

export type StoryFramework = 'heros_journey' | 'samurai_path' | 'stoic_trials' | 'phoenix_cycle';

export type SessionType = 'origin_story' | 'dark_forest' | 'rebirth' | 'destiny_path' | 'integration';

export type MythicPhase = 'setup' | 'departure' | 'ordeal' | 'return' | 'integration';

export interface MythicArchetype {
  id: string;
  kind: MythicArchetypeKind;
  name: string;
  slug: string;
  description: string | null;
  shadow_side: string | null;
  gift_side: string | null;
  triggers: any;
  strengths: any;
  pitfalls: any;
  recommended_strategies: any;
  created_at: string;
}

export interface LifeChapter {
  id: string;
  user_id: string;
  chapter_name: string;
  timeframe_start: string | null;
  timeframe_end: string | null;
  dominant_archetype_id: string | null;
  key_events: any;
  emotional_tone: string | null;
  lesson: string | null;
  status: 'active' | 'archived';
  created_at: string;
}

export interface MythicSession {
  id: string;
  user_id: string;
  session_type: SessionType;
  framework: StoryFramework;
  chapter_id: string | null;
  script_generated: string | null;
  ssml: string | null;
  audio_url: string | null;
  insights: any;
  created_at: string;
}

export interface DealArchetypeRun {
  id: string;
  user_id: string;
  deal_id: string;
  archetype_id: string;
  confidence: number;
  signals: any;
  recommended_strategy: string | null;
  created_at: string;
}

export interface MythicProfile {
  user_id: string;
  dominant_life_archetypes: Array<{ archetype_id: string; weight: number }>;
  recurring_motifs: string[];
  current_chapter_id: string | null;
  current_phase: MythicPhase | null;
  last_story_refresh_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MythicSignal {
  type: string;
  level: number;
  source?: string;
  metadata?: any;
}

export interface KeyEvent {
  id: string;
  title: string;
  date: string;
  source: string;
  metadata?: any;
}


