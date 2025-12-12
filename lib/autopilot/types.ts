// Autopilot Types
// lib/autopilot/types.ts

export type AutopilotMode = "off" | "shadow" | "assist" | "auto";
export type AutopilotActionType =
  | "email_followup"
  | "create_task"
  | "complete_task"
  | "relationship_checkin"
  | "deal_nudge"
  | "meeting_prep";

export type RiskLevel = "low" | "medium" | "high";
export type ActionStatus = "suggested" | "approved" | "executed" | "dismissed";

export interface AutopilotCandidate {
  type: AutopilotActionType;
  riskLevel: RiskLevel;
  context: Record<string, any>; // contact_id, deal_id, email_item_id, task_id, etc.
  summary?: string;
}

export interface AutopilotPolicy {
  id: string;
  user_id: string;
  mode: AutopilotMode;
  enabled_action_types: AutopilotActionType[];
  daily_action_limit: number;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  max_risk_level: RiskLevel;
  prioritize_scoreboard_rank?: boolean; // New: prioritize actions that improve rank
}

export interface AutopilotAction {
  id: string;
  user_id: string;
  action_type: AutopilotActionType;
  risk_level: RiskLevel;
  status: ActionStatus;
  context: Record<string, any>;
  suggested_summary: string | null;
  suggested_payload: Record<string, any> | null;
  executed_at: string | null;
  execution_result: Record<string, any> | null;
  created_at: string;
}

export interface AutopilotRun {
  id: string;
  user_id: string;
  mode: AutopilotMode;
  candidates_found: number;
  actions_suggested: number;
  actions_executed: number;
  actions_dismissed: number;
  run_started_at: string;
  run_completed_at: string | null;
}

