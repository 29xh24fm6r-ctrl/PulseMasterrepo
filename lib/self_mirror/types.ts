// Global Sense of Self Mirror v1 Types
// lib/self_mirror/types.ts

export interface SelfMirrorSnapshot {
  snapshotDate: string;
  identityState: any;
  destinyState: any;
  narrativeState: any;
  valuesAlignment: any;
  behaviorProfile: any;
  emotionalProfile: any;
  relationalProfile: any;
  somaticProfile: any;
  overallAlignment: number;
  driftScore: number;
  selfCompassionScore: number;
  narrativeSummary: string;
  mirrorInsights: any;
}

export interface SelfMirrorDelta {
  alignmentChange: number;
  driftChange: number;
  selfCompassionChange: number;
  identityShifts: any;
  behaviorShifts: any;
  emotionalShifts: any;
  relationalShifts: any;
  somaticShifts: any;
  summary: string;
  keyQuestions: any;
}


