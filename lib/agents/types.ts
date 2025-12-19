// lib/agents/types.ts
// Sprint 4: Agents/Minions framework types

export type AgentType =
  | "scout"
  | "organizer"
  | "nagger"
  | "researcher"
  | "crm_sheriff"
  | "calendar_prep";

export type FindingKind = "opportunity" | "risk" | "insight" | "anomaly";

export interface Agent {
  id: string;
  user_id: string;
  name: string;
  agent_type: AgentType;
  enabled: boolean;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AgentFinding {
  id: string;
  user_id: string;
  agent_id: string;
  kind: FindingKind;
  title: string;
  detail: string | null;
  data: Record<string, any>;
  severity: "info" | "low" | "medium" | "high" | "critical";
  confidence: number; // 0.0 to 1.0
  acknowledged: boolean;
  acknowledged_at: string | null;
  created_at: string;
}

export interface AgentReport {
  id: string;
  user_id: string;
  agent_id: string;
  run_id: string | null;
  findings_count: number;
  suggested_actions_count: number;
  risk_flags: string[];
  report_data: Record<string, any>;
  created_at: string;
}

export interface AgentRunResult {
  findings: Array<{
    kind: FindingKind;
    title: string;
    detail: string;
    data?: Record<string, any>;
    severity?: "info" | "low" | "medium" | "high" | "critical";
    confidence?: number;
  }>;
  suggested_actions: Array<{
    action_type: string;
    payload: Record<string, any>;
    reason: string;
  }>;
  risk_flags?: string[];
}

