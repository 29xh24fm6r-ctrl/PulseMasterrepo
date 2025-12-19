// lib/automation/types.ts
// Sprint 4: Automation types

export type AutomationScope = "email" | "tasks" | "deals" | "crm" | "calendar";

export type ActionType =
  | "create_task"
  | "complete_task"
  | "send_email"
  | "nudge_deal"
  | "schedule_followup"
  | "update_contact"
  | string;

export interface AutomationPolicy {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  scopes: AutomationScope[];
  max_actions_per_day: number;
  requires_user_confirmation: boolean;
  allowlist_rules: Record<string, any>;
  denylist_rules: Record<string, any>;
  safety_constraints: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AutomationAction {
  id: string;
  user_id: string;
  policy_id: string | null;
  action_type: ActionType;
  action_payload: Record<string, any>;
  status: "suggested" | "approved" | "executed" | "rejected" | "failed";
  result: Record<string, any> | null;
  approved_by_user: boolean;
  approved_at: string | null;
  executed_at: string | null;
  error_message: string | null;
  idempotency_key: string | null;
  correlation_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DetectorResult {
  source: string;
  entity_type: string;
  entity_id: string | null;
  signals: Array<{
    type: string;
    severity: "info" | "low" | "medium" | "high";
    data: Record<string, any>;
  }>;
}

export interface Suggestion {
  action_type: ActionType;
  payload: Record<string, any>;
  reason: string;
  confidence: number; // 0.0 to 1.0
  risk_flags: string[];
}

