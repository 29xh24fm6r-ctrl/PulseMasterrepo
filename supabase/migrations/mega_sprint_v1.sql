-- Pulse Mega Sprint v1 - Autopilot, Simulation, Memory, Industry, Jobs
-- supabase/migrations/mega_sprint_v1.sql

-- ============================================
-- SYSTEM 1: AUTOPILOT ENGINE
-- ============================================

-- Autopilot Policies
create table if not exists public.autopilot_policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  mode text default 'shadow',  -- 'off' | 'shadow' | 'assist' | 'auto'
  enabled_action_types text[] default '{}',  -- ['email_followup', 'create_task', ...]
  daily_action_limit int default 10,
  quiet_hours_start time,  -- e.g. '22:00'
  quiet_hours_end time,    -- e.g. '08:00'
  max_risk_level text default 'medium',  -- 'low' | 'medium' | 'high'
  prioritize_scoreboard_rank boolean default false,  -- prioritize actions that improve rank
  
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  unique(user_id)
);

-- Autopilot Actions
create table if not exists public.autopilot_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  action_type text not null,  -- 'email_followup' | 'create_task' | 'relationship_checkin' | 'deal_nudge' | ...
  risk_level text not null,   -- 'low' | 'medium' | 'high'
  status text default 'suggested',  -- 'suggested' | 'approved' | 'executed' | 'dismissed'
  
  context jsonb not null,  -- { contact_id, deal_id, email_item_id, etc. }
  suggested_summary text,
  suggested_payload jsonb,  -- e.g. draft email body, task details
  
  executed_at timestamptz,
  execution_result jsonb,  -- what actually happened
  
  created_at timestamptz default now()
);

create index if not exists autopilot_actions_user_status_idx
  on public.autopilot_actions (user_id, status, created_at desc);

create index if not exists autopilot_actions_type_idx
  on public.autopilot_actions (user_id, action_type, status);

-- Autopilot Runs (summary of each scan)
create table if not exists public.autopilot_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  mode text not null,  -- 'shadow' | 'assist' | 'auto'
  candidates_found int default 0,
  actions_suggested int default 0,
  actions_executed int default 0,
  actions_dismissed int default 0,
  
  run_started_at timestamptz default now(),
  run_completed_at timestamptz
);

create index if not exists autopilot_runs_user_idx
  on public.autopilot_runs (user_id, run_started_at desc);

-- ============================================
-- SYSTEM 2: SIMULATION ENGINE
-- ============================================

-- Simulation Templates
create table if not exists public.sim_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,  -- 'baseline' | 'high_discipline' | 'relationship_focused' | ...
  name text not null,
  description text,
  config jsonb not null,  -- scenario deltas
  
  created_at timestamptz default now()
);

-- Simulation Runs
create table if not exists public.sim_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  template_key text,
  custom_config jsonb,  -- overrides if custom scenario
  horizon_days int default 30,
  
  baseline_metrics jsonb,  -- snapshot at start
  predicted_metrics jsonb,  -- time series predictions
  narrative_summary text,
  tradeoffs jsonb,  -- pros/cons/risks
  
  created_at timestamptz default now()
);

create index if not exists sim_runs_user_idx
  on public.sim_runs (user_id, created_at desc);

-- ============================================
-- SYSTEM 3: UNIVERSAL MEMORY (uses existing tables)
-- ============================================
-- No new tables needed - uses mem_*, tb_*, third_brain_* tables

-- ============================================
-- SYSTEM 4: INDUSTRY INTELLIGENCE
-- ============================================

-- Industry Intelligence (already exists, but ensuring it's here)
create table if not exists public.industry_intel (
  id uuid primary key default gen_random_uuid(),
  industry_name text not null unique,
  
  structure jsonb,  -- value chain, sub-sectors
  key_roles jsonb,  -- canonical jobs
  success_patterns jsonb,
  risk_patterns jsonb,
  kpi_definitions jsonb,
  tool_stack jsonb,
  summary text,
  
  last_enriched_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Raw Public Data (for enrichment)
create table if not exists public.raw_public_data (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,  -- 'web_search' | 'news' | 'trends'
  industry_name text,
  query text,
  raw_content text,
  metadata jsonb,
  
  created_at timestamptz default now()
);

create index if not exists raw_public_data_industry_idx
  on public.raw_public_data (industry_name, source_type, created_at desc);

-- ============================================
-- SYSTEM 5: JOB GRAPH OS
-- ============================================

-- Job Graph Nodes
create table if not exists public.job_graph_nodes (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references job_graph_nodes(id),
  
  level int not null,  -- 0 = industry, 1 = sector, 2 = domain, 3+ = specific roles
  path text not null,  -- e.g. "Finance > Banking > Commercial Lending > SBA > Rural CRE"
  name text not null,
  description text,
  
  created_at timestamptz default now()
);

create index if not exists job_graph_nodes_parent_idx
  on public.job_graph_nodes (parent_id);

create index if not exists job_graph_nodes_path_idx
  on public.job_graph_nodes (path);

-- User Job Profiles
create table if not exists public.user_job_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  job_node_id uuid references job_graph_nodes(id),
  custom_title text,  -- if user wants to override
  notes text,
  
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  unique(user_id, is_active) where is_active = true
);

create index if not exists user_job_profiles_user_idx
  on public.user_job_profiles (user_id, is_active);

-- Job KPIs
create table if not exists public.job_kpis (
  id uuid primary key default gen_random_uuid(),
  job_node_id uuid references job_graph_nodes(id),
  
  kpi_key text not null,  -- e.g. 'daily_deep_work_hours'
  name text not null,
  description text,
  target_value numeric,
  weight numeric default 1.0,  -- for weighted scoring
  
  created_at timestamptz default now(),
  
  unique(job_node_id, kpi_key)
);

create index if not exists job_kpis_node_idx
  on public.job_kpis (job_node_id);

-- Job Scorecards
create table if not exists public.job_scorecards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_profile_id uuid references user_job_profiles(id),
  
  scorecard_date date not null,
  
  kpi_values jsonb,  -- { kpi_key: actual_value }
  kpi_scores jsonb,  -- { kpi_key: score_0_to_1 }
  overall_score numeric,  -- weighted average
  
  created_at timestamptz default now(),
  
  unique(user_id, job_profile_id, scorecard_date)
);

create index if not exists job_scorecards_user_date_idx
  on public.job_scorecards (user_id, scorecard_date desc);

create index if not exists job_scorecards_profile_idx
  on public.job_scorecards (job_profile_id, scorecard_date desc);

