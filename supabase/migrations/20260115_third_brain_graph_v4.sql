-- ============================================
-- THIRD BRAIN GRAPH V4 CORE
-- ============================================

create table if not exists public.tb_nodes (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references users(id) on delete cascade,
  org_id uuid references organizations(id),
  household_id uuid references households(id),

  -- High-level node type: 'event', 'person', 'project', 'deal', 'emotion_state', 
  -- 'document', 'idea', 'habit', 'place', 'call', 'message', 'task', 'experiment', etc.
  type text not null,

  -- Optional foreign key back to source module (logical, not FK)
  source_table text,
  source_id text,

  -- Core properties in JSON (flattened, LLM-friendly)
  props jsonb not null default '{}'::jsonb,

  -- Time anchoring
  started_at timestamptz,
  ended_at timestamptz,

  created_at timestamptz not null default now()
);

create index if not exists tb_nodes_user_idx
  on public.tb_nodes(user_id);

create index if not exists tb_nodes_type_idx
  on public.tb_nodes(type);

create index if not exists tb_nodes_source_idx
  on public.tb_nodes(source_table, source_id);

create index if not exists tb_nodes_time_idx
  on public.tb_nodes(started_at, ended_at);

create table if not exists public.tb_edges (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references users(id) on delete cascade,

  from_node_id uuid not null references public.tb_nodes(id) on delete cascade,
  to_node_id uuid not null references public.tb_nodes(id) on delete cascade,

  -- Relationship type: 'related_to', 'caused', 'followed', 'part_of', 
  -- 'blocked_by', 'similar_to', 'works_on', 'belongs_to', etc.
  kind text not null,

  weight numeric,                     -- optional strength/confidence
  props jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists tb_edges_user_idx
  on public.tb_edges(user_id);

create index if not exists tb_edges_from_idx
  on public.tb_edges(from_node_id);

create index if not exists tb_edges_to_idx
  on public.tb_edges(to_node_id);

create index if not exists tb_edges_kind_idx
  on public.tb_edges(kind);

-- Node Type Registry
create table if not exists public.tb_node_types (
  id uuid primary key default gen_random_uuid(),

  key text not null,                     -- 'deal', 'call', 'emotion_state', etc.
  name text not null,
  description text,

  -- JSON schema for props
  schema jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create unique index if not exists tb_node_types_key_unique
  on public.tb_node_types(key);

-- Chapters & Life Slices
create table if not exists public.tb_chapters (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references users(id) on delete cascade,

  title text not null,               -- 'Q4 2025: The Loan Officer Grind'
  summary_md text not null,          -- markdown narrative

  period_start date not null,
  period_end date not null,

  -- Key tags/themes
  tags text[],

  -- Link to representative node ids (e.g. major events)
  key_node_ids uuid[],

  created_at timestamptz not null default now()
);

create index if not exists tb_chapters_user_idx
  on public.tb_chapters(user_id);

create index if not exists tb_chapters_period_idx
  on public.tb_chapters(period_start, period_end);


