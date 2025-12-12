-- Deal & Opportunity Intelligence Engine v1
-- supabase/migrations/deal_engine_v1.sql

-- Deals Table
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  name text not null,
  description text,
  value numeric,
  status text default 'active',  -- 'active' | 'stalled' | 'won' | 'lost'
  stage text,                    -- 'prospecting' | 'proposal' | 'negotiation' | 'contracting' | 'closing' | etc.
  priority text,                 -- 'low' | 'medium' | 'high' | 'critical'
  due_date timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists deals_user_status_idx
  on public.deals (user_id, status);

create index if not exists deals_user_stage_idx
  on public.deals (user_id, stage);

-- Deal Participants
create table if not exists public.deal_participants (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  contact_id uuid references contacts(id),
  role text,    -- 'buyer' | 'decision_maker' | 'influencer' | 'blocker' | 'unknown'
  importance numeric default 0.5, -- 0..1 importance weight

  created_at timestamptz default now()
);

create index if not exists deal_participants_deal_idx
  on public.deal_participants (deal_id);

create index if not exists deal_participants_contact_idx
  on public.deal_participants (contact_id);

-- Deal Communications Link
alter table comm_messages
  add column if not exists deal_id uuid references deals(id);

create index if not exists comm_messages_deal_idx
  on public.comm_messages (deal_id) where deal_id is not null;

-- Deal Tasks & Promises
alter table email_tasks
  add column if not exists deal_id uuid references deals(id);

create index if not exists email_tasks_deal_idx
  on public.email_tasks (deal_id) where deal_id is not null;

alter table email_promises
  add column if not exists deal_id uuid references deals(id);

create index if not exists email_promises_deal_idx
  on public.email_promises (deal_id) where deal_id is not null;

-- Deal Intelligence
create table if not exists public.deal_intelligence (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references deals(id) on delete cascade,

  risk_summary text,
  blockers jsonb,
  next_steps jsonb,          -- list of actionable steps
  stall_indicators jsonb,    -- why it might be stalling
  momentum_score numeric,    -- 0..1
  confidence numeric,        -- 0..1

  generated_at timestamptz default now(),

  unique(deal_id)
);

create index if not exists deal_intelligence_deal_idx
  on public.deal_intelligence (deal_id);

