// Presence Orchestrator Types
// lib/presence/types.ts

export interface PresenceContext {
  userId: string;
  now: Date;
  prefs: any;
  emotionState?: any;
  somaticState?: any;
  calendarState?: any;
  focusMode?: 'normal' | 'deep_work' | 'off_hours';
}

export type PresenceDecisionKind = 'send_now' | 'schedule' | 'bundle' | 'suppress';

export interface PresenceEventInput {
  source: string;
  originId?: string;
  kind: string;
  title: string;
  body: string;
  importance: number; // 0..1
  urgency: number;    // 0..1
  domain?: string;
  suggestedChannel?: string;
  suggestedTimeWindow?: any;
  context?: any;
}


