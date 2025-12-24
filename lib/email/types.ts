/**
 * Email Resolution System Types
 * 
 * Core types for the Email Resolution System overlay
 */

export type EmailResolutionState =
  | "needs_user_action"
  | "waiting_on_other"
  | "scheduled_follow_up"
  | "converted_to_task"
  | "resolved";

export type ReplyIntent = 
  | "confirm"
  | "decline"
  | "buy_time"
  | "ask"
  | "commit"
  | "close";

export type EmailResolution = {
  id: string;
  userId: string;
  emailThreadId: string;
  state: EmailResolutionState;
  why: string;
  evidence: string[];
  nextActionAt?: Date | null;
  linkedTaskId?: string | null;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
};

export type EmailDraft = {
  id: string;
  userId: string;
  emailThreadId: string;
  subject?: string | null;
  bodyText: string;
  intent: ReplyIntent;
  evidence: string[];
  status: "draft" | "approved" | "sent";
  createdAt: Date;
  updatedAt: Date;
};

export type EmailFollowup = {
  id: string;
  userId: string;
  emailThreadId: string;
  dueAt: Date;
  note?: string | null;
  state: "open" | "completed" | "cancelled";
  createdAt: Date;
};

