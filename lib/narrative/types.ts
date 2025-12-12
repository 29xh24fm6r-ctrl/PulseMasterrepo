// Narrative Intelligence Types
// lib/narrative/types.ts

export interface LifeEvent {
  id?: string;
  userId: string;
  occurredAt: Date;
  kind: string;
  source: string;
  refType?: string;
  refId?: string;
  title: string;
  summary?: string;
  impact: number; // 0-1
  emotionalValence?: number; // -1 to 1
  tags?: string[];
  chapterId?: string;
}

export interface LifeChapter {
  id?: string;
  userId: string;
  chapterIndex: number;
  title: string;
  tagline?: string;
  startDate: string; // 'YYYY-MM-DD'
  endDate?: string | null;
  status: 'active' | 'past' | 'planned';
  dominantThemes: string[];
  primaryRoles: string[];
  emotionalTone?: {
    avgValence?: number;
    avgArousal?: number;
    labels?: string[];
  };
  summary?: string;
}

export interface LifeTheme {
  id?: string;
  userId: string;
  key: string;
  name: string;
  description?: string;
  domain: string[];
  strength: number; // 0-1
  firstAppearedAt?: string;
  lastActiveAt?: string;
  exampleEventIds?: string[];
}

export interface IdentityArc {
  id?: string;
  userId: string;
  key: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'abandoned';
  progress: number; // 0-1
  associatedRoles?: string[];
  drivingValues?: string[];
  relatedThemeKeys?: string[];
  startDate?: string;
  projectedEndDate?: string;
}

export interface NarrativeSnapshot {
  id?: string;
  userId: string;
  snapshotAt: Date;
  scope: 'daily' | 'weekly' | 'monthly' | 'milestone';
  chapterId?: string;
  activeThemeKeys?: string[];
  activeIdentityArcKeys?: string[];
  tensions?: Array<{
    label: string;
    details: string;
    pressure: number;
  }>;
  opportunities?: Array<{
    label: string;
    details: string;
    attractiveness: number;
  }>;
  narrativeSummary?: string;
  shortLogline?: string;
}


