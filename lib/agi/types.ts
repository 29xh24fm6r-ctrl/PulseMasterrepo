// AGI Kernel Types
// lib/agi/types.ts

export type AGIUserId = string;

export type AGITriggerType =
  | "manual"
  | "schedule_tick"
  | "email_ingested"
  | "task_overdue"
  | "calendar_change"
  | "relationship_signal"
  | "finance_signal"
  | "emotion_signal";

export interface AGITriggerContext {
  type: AGITriggerType;
  source?: string; // e.g., 'cron', 'webhook:email'
  payload?: any; // raw event if needed
}

export interface WorldState {
  userId: AGIUserId;

  // High-level snapshot of user's life:
  time: {
    now: string; // ISO string
    timezone: string;
    upcomingEvents: any[];
    overdueTasks: any[];
    todayTasks: any[];
  };

  work: {
    activeDeals: any[];
    keyDeadlines: any[];
    blockedItems: any[];
  };

  relationships: {
    importantContacts: any[];
    atRiskRelationships: any[];
    checkinsDue: any[];
    relationshipDrift?: number; // Overall drift score
  };

  finances: {
    cashflowSummary?: any;
    upcomingBills?: any[];
    anomalies?: any[];
    spendingDrift?: number;
    stressSignals?: string[];
  };

  habitsAndHealth?: {
    habits?: any[];
    streaks?: any[];
    riskSignals?: any[];
  };

  identity: {
    roles: string[]; // e.g. 'Loan Officer', 'Founder', 'Dad'
    priorities: string[]; // natural language
    values?: string[];
    archetype?: string; // e.g. 'warrior', 'strategist', 'creator'
    strengths?: string[]; // e.g. 'consistency', 'productivity'
    blindspots?: string[]; // e.g. 'task_avoidance', 'relationship_neglect'
  };

  emotion?: {
    currentState?: string; // e.g. 'stressed', 'overwhelmed', 'hyped'
    recentTrend?: string; // e.g. 'rising', 'falling', 'stable'
    intensity?: number; // 0-1
  };

  email?: {
    urgentThreads?: any[];
    waitingOnUser?: any[];
    waitingOnOthers?: any[];
    riskThreads?: any[];
    opportunities?: any[];
  };

  meta: {
    lastRunAt?: string;
    agiLevel?: "off" | "assist" | "autopilot";
    routineProfile?: {
      bestFocusWindow?: { startHour: number; endHour: number; confidence: number };
      lowEnergyWindow?: { startHour: number; endHour: number };
      avoidanceWindow?: { startHour: number; endHour: number; pattern: string };
      highPerformanceDays?: number[];
      highStressDays?: number[];
    };
  };

  predictions?: {
    likelyAfternoonStress?: "low" | "medium" | "high";
    likelyTaskSpilloverToday?: boolean;
    likelyInboxOverloadToday?: boolean;
    focusWindowsToday?: { start: string; end: string; quality: "excellent" | "good" | "fair" }[];
    riskOfProcrastinationOnKeyTasks?: boolean;
    predictedEmotionState?: string;
      predictedProductivity?: "low" | "medium" | "high";
    };
  };

  memoryGraph?: {
    keyPeople: any[];       // summarized people nodes with roles & importance
    keyProjects: any[];     // active project/deal nodes
    recentHighlights: any[]; // important events/calls/experiments recently
    currentChapter?: {
      title: string;
      summary: string;
      tags: string[];
    };
  };
}

export interface AGIAction {
  type:
    | "create_task"
    | "update_task"
    | "send_email_draft"
    | "log_insight"
    | "schedule_simulation"
    | "update_relationship_plan"
    | "update_finance_plan"
    | "nudge_user"
    | "noop";

  label: string; // human-readable summary
  details?: any; // typed payload by type
  requiresConfirmation?: boolean;
  riskLevel?: "low" | "medium" | "high";
}

export interface AgentContext {
  userId: AGIUserId;
  world: WorldState;
  trigger: AGITriggerContext;
}

export interface AgentResult {
  agentName: string;
  reasoningSummary: string;
  proposedActions: AGIAction[];
  confidence: number; // 0–1
}

export interface WeeklyReviewSummary {
  periodStart: string;
  periodEnd: string;
  highlights: string[];
  lowlights: string[];
  goalUpdates: {
    goalId: string;
    title: string;
    status: string;
    progressNote: string;
  }[];
  upcomingRisks: string[];
  upcomingOpportunities: string[];
  focusRecommendations: string[];
}

export interface AGIRunResult {
  runId: string;
  userId: AGIUserId;
  startedAt: string;
  finishedAt: string;
  trigger: AGITriggerContext;
  worldSnapshot: WorldState;
  agentResults: AgentResult[];
  finalPlan: AGIAction[];
  weeklyReviewSummary?: WeeklyReviewSummary;
  weeklyReviewSummaryNarrative?: string;
}

