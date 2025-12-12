-- Master Brain Registry + Diagnostics v1
-- supabase/migrations/20260120_master_brain_registry_v1.sql

-- ============================================
-- SYSTEM MODULES (Registry of All Engines)
-- ============================================

CREATE TABLE IF NOT EXISTS public.system_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,          -- 'mythic_intelligence', 'boardroom_brain', 'autopilot', ...
  name text NOT NULL,                -- 'Mythic Intelligence Layer'
  description text,
  category text NOT NULL,            -- 'core', 'coach', 'simulation', 'data', 'integration'
  docs_url text,
  owner text DEFAULT 'system',       -- 'system', 'user', 'org'
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_modules_category
  ON public.system_modules (category);

-- ============================================
-- SYSTEM CAPABILITIES (Specific Capabilities)
-- ============================================

CREATE TABLE IF NOT EXISTS public.system_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES system_modules(id) ON DELETE CASCADE,
  key text NOT NULL,                -- 'mythic.story_sessions', 'boardroom.decisions', 'autopilot.email_followup'
  name text NOT NULL,
  description text,
  api_route text,                   -- e.g. '/api/mythic/session/start'
  config_path text,                 -- e.g. 'config/mythic.json'
  created_at timestamptz DEFAULT now(),
  UNIQUE (module_id, key)
);

CREATE INDEX IF NOT EXISTS idx_system_capabilities_module
  ON public.system_capabilities (module_id);

-- ============================================
-- SYSTEM MODULE HEALTH (Health Status)
-- ============================================

CREATE TABLE IF NOT EXISTS public.system_module_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES system_modules(id) ON DELETE CASCADE,
  status text NOT NULL,             -- 'ok', 'degraded', 'error', 'disabled'
  status_reason text,
  error_count integer DEFAULT 0,
  last_error_at timestamptz,
  avg_latency_ms integer,
  last_check_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_module_health_module_time
  ON public.system_module_health (module_id, last_check_at DESC);

-- ============================================
-- SYSTEM CAPABILITY HEALTH (Detailed Health)
-- ============================================

CREATE TABLE IF NOT EXISTS public.system_capability_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capability_id uuid NOT NULL REFERENCES system_capabilities(id) ON DELETE CASCADE,
  status text NOT NULL,             -- 'ok', 'degraded', 'error', 'disabled'
  status_reason text,
  error_count integer DEFAULT 0,
  last_error_at timestamptz,
  avg_latency_ms integer,
  last_check_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_capability_health_capability_time
  ON public.system_capability_health (capability_id, last_check_at DESC);

-- ============================================
-- SYSTEM MODULE METRICS (Daily Aggregates)
-- ============================================

CREATE TABLE IF NOT EXISTS public.system_module_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES system_modules(id) ON DELETE CASCADE,
  date date NOT NULL,
  invocation_count integer DEFAULT 0,
  error_count integer DEFAULT 0,
  avg_latency_ms integer,
  user_touch_count integer DEFAULT 0,    -- UI touches
  last_invocation_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (module_id, date)
);

CREATE INDEX IF NOT EXISTS idx_system_module_metrics_module_date
  ON public.system_module_metrics (module_id, date DESC);

-- ============================================
-- SYSTEM DIAGNOSTICS RUNS (Historic Runs)
-- ============================================

CREATE TABLE IF NOT EXISTS public.system_diagnostics_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type text NOT NULL,           -- 'daily', 'manual', 'post-deploy'
  initiated_by text NOT NULL,       -- 'system' | 'user:<id>' | 'deploy_hook'
  status text NOT NULL,             -- 'in_progress', 'completed', 'failed'
  summary text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_system_diagnostics_runs_time
  ON public.system_diagnostics_runs (created_at DESC);

-- ============================================
-- SYSTEM DIAGNOSTICS FINDINGS (Findings)
-- ============================================

CREATE TABLE IF NOT EXISTS public.system_diagnostics_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES system_diagnostics_runs(id) ON DELETE CASCADE,
  severity text NOT NULL,           -- 'info', 'warning', 'critical'
  category text NOT NULL,           -- 'health', 'config', 'usage', 'data_staleness'
  module_id uuid REFERENCES system_modules(id),
  capability_id uuid REFERENCES system_capabilities(id),
  title text NOT NULL,              -- 'Deal Archetype Lens underused'
  description text,
  recommendation text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_diagnostics_findings_run_severity
  ON public.system_diagnostics_findings (run_id, severity);


