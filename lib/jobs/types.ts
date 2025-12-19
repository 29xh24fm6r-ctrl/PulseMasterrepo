// lib/jobs/types.ts
// Sprint 4: Job system types

export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";

export type JobType =
  | "email_needs_response_tasks"
  | "autopilot_scan"
  | "agent_run"
  | "habit_reminder"
  | "deal_nudge"
  | "contact_enrichment"
  | string; // Allow custom job types

export interface JobQueueRow {
  id: string;
  user_id: string;
  job_type: JobType;
  payload: Record<string, any>;
  status: JobStatus;
  attempts: number;
  max_attempts: number;
  scheduled_at: string;
  started_at: string | null;
  finished_at: string | null;
  last_error: string | null;
  result: Record<string, any> | null;
  idempotency_key: string | null;
  correlation_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobRunRow {
  id: string;
  job_id: string;
  user_id: string;
  job_type: JobType;
  status: "running" | "succeeded" | "failed";
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  error_stack: string | null;
  result: Record<string, any> | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface CreateJobInput {
  user_id: string;
  job_type: JobType;
  payload?: Record<string, any>;
  scheduled_at?: string;
  idempotency_key?: string;
  correlation_id?: string;
  max_attempts?: number;
}

export interface JobExecutionResult {
  success: boolean;
  result?: Record<string, any>;
  error?: string;
  errorStack?: string;
}

