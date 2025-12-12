// Life Canon v1 - Types
// lib/life_canon/v1/types.ts

export interface LifeChapter {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  chapterOrder: number;
  title: string;
  subtitle?: string | null;
  summary?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  tone?: any;
  themes?: { rising?: string[]; fading?: string[] };
  internalConflicts?: any;
  externalConflicts?: any;
  identityState?: any;
  destinyState?: any;
  relationshipState?: any;
  somaticState?: any;
}

export interface CanonEvent {
  id: string;
  userId: string;
  createdAt: string;
  eventType: string;
  title: string;
  description?: string | null;
  emotionalTone?: any;
  consequences?: any;
  importance: number;
  attachedChapter?: string | null;
  source?: string | null;
  sourceId?: string | null;
}

export interface IdentityTransform {
  id: string;
  userId: string;
  occurredAt: string;
  previousIdentity?: any;
  newIdentity?: any;
  catalysts?: any;
  emotions?: any;
  narrativeExplanation?: string | null;
}

export interface LifeCanonSnapshot {
  id: string;
  userId: string;
  snapshotTime: string;
  activeChapter?: any;
  recentEvents?: any;
  activeThemes?: any;
  narrativeSummary?: string | null;
  predictedNextChapter?: any;
  upcomingTurningPoints?: any;
}

export interface CanonContext {
  currentChapter?: LifeChapter | null;
  recentEvents: CanonEvent[];
  activeThemes: { rising: string[]; fading: string[] };
  identityTransforms: IdentityTransform[];
  narrativeSummary?: string;
  predictedNextChapter?: any;
  upcomingTurningPoints?: any;
}


