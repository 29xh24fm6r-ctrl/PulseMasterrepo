begin;

-- =========================================================
-- A) Inbox Autopilot: rules + runs + outcomes
-- =========================================================

create table if not exists public.inbox_rules (
  id uuid primary key default gen_random_uuid(),
  user_id_uuid uuid not null references public.identity_users(id) on delete cascade,

  enabled boolean not null default true,
  priority int not null default 100,

  -- matchers (all optional; rule matches if ALL provided match)
  match_from_email text,
  match_subject_contains text,
  match_body_contains text,
  match_snippet_contains text,

  -- actions
  action_type text not null, -- 'create_follow_up' | 'create_task' | 'mark_read' | 'archive'
  action_title_template text, -- supports tokens: {{subject}}, {{from}}, {{snippet}}
  action_due_minutes int,     -- if set, due_at = received_at + minutes
  action_status text,         -- follow-ups: open/snoozed/done; tasks: open/in_progress/blocked/done/archived
  action_archive boolean not null default false,
  action_mark_read boolean not null default true,

  meta jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_inbox_rules_user_enabled_priority
  on public.inbox_rules (user_id_uuid, enabled, priority);

drop trigger if exists trg_inbox_rules_set_updated_at on public.inbox_rules;
create trigger trg_inbox_rules_set_updated_at
before update on public.inbox_rules
for each row execute function public.tg_set_updated_at();


create table if not exists public.inbox_rule_runs (
  id uuid primary key default gen_random_uuid(),
  user_id_uuid uuid not null references public.identity_users(id) on delete cascade,

  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running', -- running | success | failed
  processed_count int not null default 0,
  matched_count int not null default 0,
  actions_count int not null default 0,
  error text,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists idx_inbox_rule_runs_user_started
  on public.inbox_rule_runs (user_id_uuid, started_at desc);


create table if not exists public.inbox_rule_outcomes (
  id uuid primary key default gen_random_uuid(),
  user_id_uuid uuid not null references public.identity_users(id) on delete cascade,
  run_id uuid not null references public.inbox_rule_runs(id) on delete cascade,

  inbox_item_id uuid not null references public.inbox_items(id) on delete cascade,
  rule_id uuid references public.inbox_rules(id) on delete set null,

  matched boolean not null default false,
  action_type text,
  target_table text,
  target_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_inbox_rule_outcomes_user_run
  on public.inbox_rule_outcomes (user_id_uuid, run_id);

create index if not exists idx_inbox_rule_outcomes_inbox_item
  on public.inbox_rule_outcomes (inbox_item_id);


-- =========================================================
-- B) RLS for autopilot tables
-- =========================================================

alter table public.inbox_rules enable row level security;
alter table public.inbox_rule_runs enable row level security;
alter table public.inbox_rule_outcomes enable row level security;

do $$
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='inbox_rules' and policyname='inbox_rules_owner_all') then
    execute 'drop policy inbox_rules_owner_all on public.inbox_rules';
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='inbox_rule_runs' and policyname='inbox_rule_runs_owner_all') then
    execute 'drop policy inbox_rule_runs_owner_all on public.inbox_rule_runs';
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='inbox_rule_outcomes' and policyname='inbox_rule_outcomes_owner_all') then
    execute 'drop policy inbox_rule_outcomes_owner_all on public.inbox_rule_outcomes';
  end if;
end$$;

create policy inbox_rules_owner_all
on public.inbox_rules
for all
using (user_id_uuid = public.current_user_id_uuid())
with check (user_id_uuid = public.current_user_id_uuid());

create policy inbox_rule_runs_owner_all
on public.inbox_rule_runs
for all
using (user_id_uuid = public.current_user_id_uuid())
with check (user_id_uuid = public.current_user_id_uuid());

create policy inbox_rule_outcomes_owner_all
on public.inbox_rule_outcomes
for all
using (user_id_uuid = public.current_user_id_uuid())
with check (user_id_uuid = public.current_user_id_uuid());


-- =========================================================
-- C) Health views (read-only summaries)
-- =========================================================

create or replace view public.health_core_summary as
select
  (select count(*) from public.identity_users where is_archived = false) as active_identities,
  (select count(*) from public.pulse_events where user_id_uuid = '00000000-0000-0000-0000-000000000000'::uuid) as zero_uuid_events_total,
  (select count(*) from public.pulse_events where created_at > now() - interval '24 hours'
     and user_id_uuid = '00000000-0000-0000-0000-000000000000'::uuid) as zero_uuid_events_24h,
  (select count(*) from public.follow_ups where user_id_uuid is null) as follow_ups_null_owner,
  (select count(*) from public.tasks where user_id_uuid is null) as tasks_null_owner,
  (select count(*) from public.deals where user_id_uuid is null) as deals_null_owner;

create or replace view public.health_rls_status as
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname='public'
  and tablename in (
    'follow_ups','tasks','deals',
    'inbox_items','inbox_actions',
    'inbox_rules','inbox_rule_runs','inbox_rule_outcomes'
  );

commit;
