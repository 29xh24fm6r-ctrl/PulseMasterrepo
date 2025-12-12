// AGI Trigger Factory Functions
// lib/agi/triggers.ts

import { AGITriggerContext } from "./types";

export function manualTrigger(source = "user"): AGITriggerContext {
  return { type: "manual", source };
}

export function scheduleTickTrigger(source = "cron/daily"): AGITriggerContext {
  return { type: "schedule_tick", source };
}

export function emailIngestedTrigger(emailMeta: {
  threadId?: string;
  from?: string;
  to?: string;
  subject?: string;
  hasDeadlines?: boolean;
  isFromHighPriorityContact?: boolean;
}): AGITriggerContext {
  return {
    type: "email_ingested",
    source: "email_intelligence",
    payload: emailMeta,
  };
}

export function taskOverdueTrigger(meta: {
  overdueCount?: number;
  oldestOverdueDays?: number;
}): AGITriggerContext {
  return {
    type: "task_overdue",
    source: "task_system",
    payload: meta,
  };
}

export function calendarChangeTrigger(meta: {
  eventId?: string;
  changeType?: "created" | "updated" | "deleted";
  eventTitle?: string;
}): AGITriggerContext {
  return {
    type: "calendar_change",
    source: "calendar_sync",
    payload: meta,
  };
}

export function relationshipSignalTrigger(meta: {
  atRiskCount?: number;
  importantContacts?: any[];
  checkinsDue?: number;
  relationshipId?: string;
}): AGITriggerContext {
  return {
    type: "relationship_signal",
    source: "relationship_engine",
    payload: meta,
  };
}

export function financeSignalTrigger(meta: {
  anomalyType?: string;
  amount?: number;
  upcomingBillsCount?: number;
  cashflowTrend?: string;
}): AGITriggerContext {
  return {
    type: "finance_signal",
    source: "finance_engine",
    payload: meta,
  };
}

export function emotionSignalTrigger(meta: {
  state?: string;
  trend?: string;
  intensity?: number;
}): AGITriggerContext {
  return {
    type: "emotion_signal",
    source: "emotion_os",
    payload: meta,
  };
}



