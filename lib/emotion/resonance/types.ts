// Emotional Resonance v2 Types
// lib/emotion/resonance/types.ts

export interface EmotionStyleProfile {
  baselineStyle: any;
  crisisStyle: any;
  hypeStyle: any;
  reflectiveStyle: any;
  emotionToStyleMap: any;
  personaPreferences: any;
  boundaries: any;
  summary?: string;
}

export interface ResponseStyle {
  tone: string;           // 'calm', 'hype', 'soft', 'blunt', etc.
  stance: string;         // 'companion', 'coach', 'strategist', 'therapist_like'
  length: 'short' | 'medium' | 'long';
  personaKey?: string;    // which coach/persona to route through
  channelHints?: any;
}

export interface EmotionInteractionContext {
  userId: string;
  channel: string;
  context?: string;
  inputEmotionState: any;
  inputSomaticState: any;
  narrativeContext?: any;
  socialContext?: any;
  tomProfilesInvolved?: any[];
}


