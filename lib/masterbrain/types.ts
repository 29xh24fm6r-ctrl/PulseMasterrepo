// Master Brain Registry + Diagnostics v1 - Types
// lib/masterbrain/types.ts

export type ModuleStatus = 'ok' | 'degraded' | 'error' | 'disabled';

export type ModuleCategory = 'core' | 'coach' | 'simulation' | 'data' | 'integration';

export type DiagnosticsSeverity = 'info' | 'warning' | 'critical';

export type DiagnosticsCategory = 'health' | 'config' | 'usage' | 'data_staleness';

export type DiagnosticsRunType = 'daily' | 'manual' | 'post_deploy';

export type DiagnosticsRunStatus = 'in_progress' | 'completed' | 'failed';

export interface SystemModule {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: ModuleCategory;
  docs_url: string | null;
  owner: string;
  created_at: string;
}

export interface SystemCapability {
  id: string;
  module_id: string;
  key: string;
  name: string;
  description: string | null;
  api_route: string | null;
  config_path: string | null;
  created_at: string;
}

export interface ModuleHealth {
  id: string;
  module_id: string;
  status: ModuleStatus;
  status_reason: string | null;
  error_count: number;
  last_error_at: string | null;
  avg_latency_ms: number | null;
  last_check_at: string;
  created_at: string;
}

export interface CapabilityHealth {
  id: string;
  capability_id: string;
  status: ModuleStatus;
  status_reason: string | null;
  error_count: number;
  last_error_at: string | null;
  avg_latency_ms: number | null;
  last_check_at: string;
  created_at: string;
}

export interface ModuleMetrics {
  id: string;
  module_id: string;
  date: string;
  invocation_count: number;
  error_count: number;
  avg_latency_ms: number | null;
  user_touch_count: number;
  last_invocation_at: string | null;
  created_at: string;
}

export interface DiagnosticsRun {
  id: string;
  run_type: DiagnosticsRunType;
  initiated_by: string;
  status: DiagnosticsRunStatus;
  summary: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface DiagnosticsFinding {
  id: string;
  run_id: string;
  severity: DiagnosticsSeverity;
  category: DiagnosticsCategory;
  module_id: string | null;
  capability_id: string | null;
  title: string;
  description: string | null;
  recommendation: string | null;
  created_at: string;
}


