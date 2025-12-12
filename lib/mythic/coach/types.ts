// Mythic Coach Engine v1 - Types
// lib/mythic/coach/types.ts

import { LifeChapter, MythicProfile, DealArchetypeRun } from '../types';

export type MythicCoachMode = 'ad_hoc' | 'daily_ritual' | 'deal_review' | 'crisis';

export type MythicCoachIntensity = 'soft' | 'medium' | 'warrior';

export type MythicCoachTone = 'grounded' | 'epic' | 'playful';

export type MythicCoachSessionLength = 'micro' | 'short' | 'deep';

export interface MythicContext {
  userId: string;
  currentChapter: LifeChapter | null;
  mythicProfile: MythicProfile | null;
  activeDeals: Array<{
    deal_id: string;
    archetype_run: DealArchetypeRun | null;
  }>;
  emotionSnapshot: {
    stress_level?: number;
    valence?: number;
    state?: string;
  } | null;
  identityTraits: any;
  activeGoals: any[];
}

export interface MythicPlaybook {
  id: string;
  archetype_id: string | null;
  context: string;
  name: string;
  slug: string;
  description: string | null;
  triggers: any;
  actions: any;
  example_language: any;
  created_at: string;
}

export interface MythicCoachSettings {
  user_id: string;
  intensity: MythicCoachIntensity;
  tone: MythicCoachTone;
  session_length: MythicCoachSessionLength;
  enabled: boolean;
  preferred_framework: string;
  last_daily_ritual_at: string | null;
  created_at: string;
  updated_at: string;
}


