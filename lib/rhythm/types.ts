// Daily Rhythm Types
// lib/rhythm/types.ts

export type DailyEntryType =
  | "morning_briefing"
  | "midday_checkin"
  | "evening_debrief";

export interface DailyRhythmEntry {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  type: DailyEntryType;
  summary: string | null;
  data: any;
}

export interface MorningBriefingData {
  date: string;
  topRisks: {
    time: string;
    risk_type: string;
    risk_score: number;
    context_label: string;
  }[];
  keyEvents: {
    time: string;
    title: string;
    risk_flag?: boolean;
  }[];
  identityFocus?: {
    identity_name: string;
    message: string;
  } | null;
  suggestedCoaches: {
    coachId: string;
    reason: string;
  }[];
  emailOwedCount?: number;
  topEmailFollowups?: Array<{ from: string; subject: string }>;
  attentionScore?: {
    score: number;
    riskLevel: string;
  } | null;
  brokenPromises?: Array<{ promiseText: string; dueAt: string; source?: string }>;
  audioObligationsCount?: number;
}

export interface MiddayCheckinData {
  date: string;
  completedSessions: number;
  mxpEarned: number;
  emotionTrend: {
    stressCount: number;
    calmCount: number;
  };
  nudges: string[]; // e.g. ["Take 3 deep breaths before your 3pm call"]
}

export interface EveningDebriefData {
  date: string;
  wins: string[];
  struggles: string[];
  mxpEarned: number;
  identityProgress: {
    identity_name: string;
    xp_gained: number;
  }[];
  suggestedReflectionQuestions: string[];
}

export interface WeeklyReviewData {
  weekStart: string;
  totalMXP: number;
  sessionsCount: number;
  topIdentities: {
    name: string;
    xpGained: number;
  }[];
  emotionCounts: {
    stress: number;
    calm: number;
    hype: number;
    sad: number;
  };
  chapterInfo?: {
    currentChapterTitle: string | null;
    chapterStarted: string | null;
  };
  keyWins: string[];
  keyStruggles: string[];
}

