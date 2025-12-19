-- Sprint 4: Jobs, Automation, Agents, Audit Foundation
-- supabase/migrations/20241216_sprint4_jobs_automation_agents.sql

-- ============================================
-- JOB QUEUE
-- ============================================

CREATE TABLE IF NOT EXISTS public.job_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  job_type text NOT NULL,                    -- 'email_needs_response_tasks' | 'autopilot_scan' | 'agent_run' | etc.
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  status text NOT NULL DEFAULT 'queued',     -- 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled'
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 3,
  
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  
  last_error text,
  result jsonb,                              -- final result if succeeded
  
  idempotency_key text,                      -- unique per user+job_type+semantic_key
  correlation_id uuid,                       -- groups related jobs
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_status CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'canceled')),
  CONSTRAINT valid_attempts CHECK (attempts >= 0 AND attempts <= max_attempts)
);

CREATE INDEX IF NOT EXISTS idx_job_queue_user_status 
  ON public.job_queue (user_id, status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_job_queue_idempotency 
  ON public.job_queue (user_id, job_type, idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_job_queue_claimable 
  ON public.job_queue (status, scheduled_at) 
  WHERE status = 'queued';

CREATE UNIQUE INDEX IF NOT EXISTS uniq_job_queue_idempotency 
  ON public.job_queue (user_id, job_type, idempotency_key) 
  WHERE idempotency_key IS NOT NULL AND status = 'succeeded';

-- ============================================
-- JOB RUNS (Execution History)
-- ============================================

CREATE TABLE IF NOT EXISTS public.job_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.job_queue(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  job_type text NOT NULL,
  status text NOT NULL,                      -- 'running' | 'succeeded' | 'failed'
  
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms int,
  
  error_message text,
  error_stack text,
  result jsonb,
  
  metadata jsonb DEFAULT '{}'::jsonb,        -- worker_id, retry_count, etc.
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_runs_job_id 
  ON public.job_runs (job_id);

CREATE INDEX IF NOT EXISTS idx_job_runs_user_status 
  ON public.job_runs (user_id, status, started_at DESC);

-- ============================================
-- AUTOMATION POLICIES
-- ============================================

CREATE TABLE IF NOT EXISTS public.automation_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT false,
  
  scopes text[] NOT NULL DEFAULT '{}'::text[],  -- ['email', 'tasks', 'deals', 'crm', 'calendar']
  
  max_actions_per_day int NOT NULL DEFAULT 10,
  requires_user_confirmation boolean NOT NULL DEFAULT true,
  
  allowlist_rules jsonb DEFAULT '{}'::jsonb,     -- { action_types: [...], conditions: {...} }
  denylist_rules jsonb DEFAULT '{}'::jsonb,    -- { action_types: [...], conditions: {...} }
  safety_constraints jsonb DEFAULT '{}'::jsonb, -- { never_send_email: true, max_amount: 1000, etc. }
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_policies_user_enabled 
  ON public.automation_policies (user_id, enabled);

-- ============================================
-- AUTOMATION ACTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.automation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  policy_id uuid REFERENCES public.automation_policies(id) ON DELETE SET NULL,
  
  action_type text NOT NULL,                  -- 'create_task' | 'complete_task' | 'send_email' | 'nudge_deal' | 'schedule_followup'
  action_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  status text NOT NULL DEFAULT 'suggested',   -- 'suggested' | 'approved' | 'executed' | 'rejected' | 'failed'
  result jsonb,                               -- execution result
  
  approved_by_user boolean NOT NULL DEFAULT false,
  approved_at timestamptz,
  
  executed_at timestamptz,
  error_message text,
  
  idempotency_key text,
  correlation_id uuid,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_action_status CHECK (status IN ('suggested', 'approved', 'executed', 'rejected', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_automation_actions_user_status 
  ON public.automation_actions (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_automation_actions_policy 
  ON public.automation_actions (policy_id) 
  WHERE policy_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_automation_actions_idempotency 
  ON public.automation_actions (user_id, action_type, idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

-- ============================================
-- AUTOMATION RUNS
-- ============================================

CREATE TABLE IF NOT EXISTS public.automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  policy_id uuid REFERENCES public.automation_policies(id) ON DELETE SET NULL,
  
  run_type text NOT NULL,                     -- 'detector' | 'suggestion' | 'execution'
  status text NOT NULL,                       -- 'running' | 'succeeded' | 'failed'
  
  sources_scanned jsonb DEFAULT '{}'::jsonb, -- what was scanned
  suggestions_count int DEFAULT 0,
  actions_executed_count int DEFAULT 0,
  
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms int,
  
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_runs_user_status 
  ON public.automation_runs (user_id, status, started_at DESC);

-- ============================================
-- AGENTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  agent_type text NOT NULL,                   -- 'scout' | 'organizer' | 'nagger' | 'researcher' | 'crm_sheriff' | 'calendar_prep'
  enabled boolean NOT NULL DEFAULT true,
  
  config jsonb DEFAULT '{}'::jsonb,           -- agent-specific configuration
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agents_user_enabled 
  ON public.agents (user_id, enabled);

-- ============================================
-- AGENT FINDINGS
-- ============================================

CREATE TABLE IF NOT EXISTS public.agent_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  
  kind text NOT NULL,                          -- 'opportunity' | 'risk' | 'insight' | 'anomaly'
  title text NOT NULL,
  detail text,
  data jsonb DEFAULT '{}'::jsonb,
  
  severity text DEFAULT 'info',               -- 'info' | 'low' | 'medium' | 'high' | 'critical'
  confidence numeric(3,2) DEFAULT 0.5,        -- 0.0 to 1.0
  
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_at timestamptz,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_findings_user_agent 
  ON public.agent_findings (user_id, agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_findings_unacknowledged 
  ON public.agent_findings (user_id, acknowledged) 
  WHERE acknowledged = false;

-- ============================================
-- AGENT REPORTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.agent_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  
  run_id uuid,                                -- links to job_runs if run via job system
  
  findings_count int DEFAULT 0,
  suggested_actions_count int DEFAULT 0,
  risk_flags text[] DEFAULT '{}'::text[],
  
  report_data jsonb DEFAULT '{}'::jsonb,      -- full report structure
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_reports_user_agent 
  ON public.agent_reports (user_id, agent_id, created_at DESC);

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  action_type text NOT NULL,                  -- 'job_executed' | 'automation_action' | 'agent_finding' | 'user_action'
  entity_type text,                           -- 'task' | 'deal' | 'contact' | 'email' | etc.
  entity_id uuid,
  
  action text NOT NULL,                       -- 'create' | 'update' | 'delete' | 'execute' | etc.
  payload jsonb DEFAULT '{}'::jsonb,
  
  source text NOT NULL,                       -- 'user' | 'automation' | 'agent' | 'job' | 'api'
  source_id uuid,                             -- job_id, automation_action_id, agent_id, etc.
  
  correlation_id uuid,
  ip_address inet,
  user_agent text,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_created 
  ON public.audit_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity 
  ON public.audit_log (entity_type, entity_id) 
  WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_source 
  ON public.audit_log (source, source_id) 
  WHERE source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_correlation 
  ON public.audit_log (correlation_id) 
  WHERE correlation_id IS NOT NULL;

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

CREATE TRIGGER update_job_queue_updated_at
  BEFORE UPDATE ON public.job_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automation_policies_updated_at
  BEFORE UPDATE ON public.automation_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automation_actions_updated_at
  BEFORE UPDATE ON public.automation_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Job Queue: Users can view their own jobs
CREATE POLICY "Users can view own jobs"
  ON public.job_queue FOR SELECT
  USING (user_id = public.current_user_row_id());

-- Job Runs: Users can view their own runs
CREATE POLICY "Users can view own job runs"
  ON public.job_runs FOR SELECT
  USING (user_id = public.current_user_row_id());

-- Automation Policies: Users can manage their own policies
CREATE POLICY "Users can manage own policies"
  ON public.automation_policies
  USING (user_id = public.current_user_row_id())
  WITH CHECK (user_id = public.current_user_row_id());

-- Automation Actions: Users can view their own actions
CREATE POLICY "Users can view own actions"
  ON public.automation_actions FOR SELECT
  USING (user_id = public.current_user_row_id());

CREATE POLICY "Users can update own actions"
  ON public.automation_actions FOR UPDATE
  USING (user_id = public.current_user_row_id())
  WITH CHECK (user_id = public.current_user_row_id());

-- Automation Runs: Users can view their own runs
CREATE POLICY "Users can view own automation runs"
  ON public.automation_runs FOR SELECT
  USING (user_id = public.current_user_row_id());

-- Agents: Users can manage their own agents
CREATE POLICY "Users can manage own agents"
  ON public.agents
  USING (user_id = public.current_user_row_id())
  WITH CHECK (user_id = public.current_user_row_id());

-- Agent Findings: Users can view their own findings
CREATE POLICY "Users can view own findings"
  ON public.agent_findings FOR SELECT
  USING (user_id = public.current_user_row_id());

CREATE POLICY "Users can update own findings"
  ON public.agent_findings FOR UPDATE
  USING (user_id = public.current_user_row_id())
  WITH CHECK (user_id = public.current_user_row_id());

-- Agent Reports: Users can view their own reports
CREATE POLICY "Users can view own reports"
  ON public.agent_reports FOR SELECT
  USING (user_id = public.current_user_row_id());

-- Audit Log: Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
  ON public.audit_log FOR SELECT
  USING (user_id = public.current_user_row_id());

