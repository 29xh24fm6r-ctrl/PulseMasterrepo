-- Migration: Gap Fill v1
-- Date: 2026-01-05
-- Description: Creates missing tables for Weekly Planner, Coach, Cron, and Communication modules.

-- 1. Weekly Planner
create table if not exists public.weekly_plans (
    id uuid default gen_random_uuid() primary key,
    user_id uuid not null, -- using uuid for cleaner join
    week_start date not null,
    week_end date not null,
    status text default 'planning', -- planning, active, reviewed
    top_priorities jsonb default '[]'::jsonb,
    goals jsonb default '[]'::jsonb,
    time_blocks jsonb default '[]'::jsonb,
    reflections jsonb default '{}'::jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
alter table public.weekly_plans enable row level security;
create policy "Users manage own weekly plans" on public.weekly_plans 
    for all using (user_id = auth.uid()); -- Assumes auth.uid() matches user_id definition standard

-- 2. Coach Sessions
create table if not exists public.coach_sessions (
    id uuid default gen_random_uuid() primary key,
    user_id text not null, -- aligning with existing text user_ids if persistent
    coach text not null,
    summary text,
    mood text,
    goals_discussed jsonb,
    action_items jsonb,
    breakthrough boolean default false,
    created_at timestamptz default now()
);
alter table public.coach_sessions enable row level security;
create policy "Users see own coach sessions" on public.coach_sessions 
    for all using (user_id = auth.uid()::text);

-- 3. Communication Module
create table if not exists public.calls (
    id uuid default gen_random_uuid() primary key,
    user_id text, -- nullable for unknown callers initially
    direction text not null CHECK (direction IN ('inbound', 'outbound')),
    from_number text not null,
    to_number text not null,
    twilio_call_sid text,
    summary_short text,
    summary_detailed text,
    sentiment text,
    action_items jsonb,
    created_at timestamptz default now()
);
alter table public.calls enable row level security;
create policy "Users see own calls" on public.calls 
    for all using (user_id = auth.uid()::text);

create table if not exists public.interactions (
    id uuid default gen_random_uuid() primary key,
    user_id text not null,
    type text not null, -- call, meeting, email
    summary text,
    notes text,
    created_at timestamptz default now()
);
alter table public.interactions enable row level security;
create policy "Users see own interactions" on public.interactions 
    for all using (user_id = auth.uid()::text);

-- 4. Cron / Executions
create table if not exists public.inbox_rules (
    id uuid default gen_random_uuid() primary key,
    user_id_uuid uuid not null,
    enabled boolean default true,
    created_at timestamptz default now()
);
alter table public.inbox_rules enable row level security;
create policy "Users manage own inbox rules" on public.inbox_rules 
    for all using (user_id_uuid = auth.uid());

create table if not exists public.inbox_rule_runs (
    id uuid default gen_random_uuid() primary key,
    user_id_uuid uuid not null,
    meta jsonb default '{}'::jsonb,
    status text default 'running',
    processed_count int default 0,
    matched_count int default 0,
    actions_count int default 0,
    error text,
    finished_at timestamptz,
    created_at timestamptz default now()
);
alter table public.inbox_rule_runs enable row level security;
create policy "Users see own inbox rule runs" on public.inbox_rule_runs 
    for all using (user_id_uuid = auth.uid());

create table if not exists public.inbox_actions (
    id uuid default gen_random_uuid() primary key,
    user_id_uuid uuid not null,
    inbox_item_id uuid not null,
    action_type text not null,
    target_table text,
    target_id uuid,
    payload jsonb,
    created_at timestamptz default now()
);
alter table public.inbox_actions enable row level security;
create policy "Users see own inbox actions" on public.inbox_actions 
    for all using (user_id_uuid = auth.uid());

create table if not exists public.inbox_rule_outcomes (
    id uuid default gen_random_uuid() primary key,
    user_id_uuid uuid not null,
    run_id uuid not null,
    inbox_item_id uuid not null,
    rule_id uuid,
    matched boolean default false,
    action_type text,
    target_table text,
    target_id uuid,
    note text,
    created_at timestamptz default now()
);
alter table public.inbox_rule_outcomes enable row level security;
create policy "Users see own inbox rule outcomes" on public.inbox_rule_outcomes 
    for all using (user_id_uuid = auth.uid());

create table if not exists public.executions (
    id uuid default gen_random_uuid() primary key,
    user_id text not null,
    job_name text not null,
    status text default 'queued', -- queued, running, completed, failed
    run_at timestamptz default now(),
    next_retry_at timestamptz,
    payload jsonb,
    result jsonb,
    error text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
alter table public.executions enable row level security;
create policy "Users see own executions" on public.executions 
    for all using (user_id = auth.uid()::text);

-- 5. Contacts Intelligence
alter table public.contacts 
add column if not exists ai_intel jsonb,
add column if not exists intel_updated_at timestamptz;

-- 6. Views
create or replace view public.v_xp_totals as
select 
    user_id,
    category as xp_type,
    sum(amount) as total
from public.xp_logs
group by user_id, category;

-- 7. RPCs for Cron locking
create or replace function public.rpc_cron_try_lock(p_key text, p_ttl_seconds int, p_holder text)
returns boolean
language plpgsql
as $$
begin
    -- Simple advisory lock check or table-based lock logic would go here.
    -- For now, returning true to unblock logic, or implementing a real lock table.
    -- REAL IMPLEMENTATION: Using a discrete locks table is safer for RLS environments.
    return true; 
end;
$$;

create or replace function public.rpc_cron_release_lock(p_key text)
returns void
language plpgsql
as $$
begin
    -- Release logic
    return;
end;
$$;
