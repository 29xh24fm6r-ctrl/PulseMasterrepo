// Productivity Engine Types
// lib/productivity/types.ts

export type WorkItemSource =
  | "task"
  | "email_followup"
  | "relationship_nudge"
  | "deal_nudge"
  | "calendar"
  | "autopilot_suggestion";

export type FocusModeType = "single_task" | "power_hour";

export type EnergyRequired = "low" | "medium" | "high";

export interface WorkItem {
  id: string;
  source: WorkItemSource;
  title: string;
  description?: string;
  dueAt?: string | null;
  projectId?: string | null;
  relationshipId?: string | null;
  dealId?: string | null;
  emailId?: string | null;
  estimatedMinutes?: number;
  importanceScore: number; // 0–100
  urgencyScore: number; // 0–100
  energyRequired: EnergyRequired;
  tags?: string[];
  metadata?: Record<string, any>; // For source-specific data
}

export interface FocusSession {
  id: string;
  userId: string;
  mode: FocusModeType;
  startedAt: string;
  endedAt?: string | null;
  workItemIds: string[];
  completedCount: number;
  totalPlanned: number;
  xpAwarded?: number;
}

export interface TodayPlan {
  bigThree: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
  supportActions: string[]; // WorkItem IDs
  createdAt: string;
  updatedAt: string;
}

export interface DailyReview {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  completedItems: number;
  plannedItems: number;
  focusSessions: number;
  xpEarned: number;
  reflection?: string;
  highlights?: string[];
  challenges?: string[];
  createdAt: string;
}



