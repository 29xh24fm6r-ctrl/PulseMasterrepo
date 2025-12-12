// Deep Narrative Engine v1 Types
// lib/cortex/sovereign/deep-narrative/types.ts

export interface NarrativeTheme {
  id: string;
  label: string;
  description: string;
  positivePole: string;
  negativePole: string;
  strength: number; // 0-1, how dominant this theme is
}

export interface LifeNarrative {
  userId: string;
  updatedAt: string;
  currentChapterTitle: string;
  currentChapterSummary: string;
  chapterSummaries: Array<{
    id: string;
    title: string;
    summary: string;
    startDate: string;
    endDate?: string;
    dominantThemes: string[];
  }>;
  dominantThemes: NarrativeTheme[];
  growthEdges: string[];
  repeatingConflicts: string[];
  emergingPossibilities: string[];
  narrativeArc: "rising" | "falling" | "stable" | "transforming";
  keyInsights: string[];
}



