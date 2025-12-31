-- ============================================
-- Pulse OS — Core Table Hardening
-- B) RLS + constraints + indexes + updated_at
-- Tables: follow_ups, tasks, deals, crm_deals (if present)
-- Canon: user_id_uuid uuid NOT NULL references identity_users(id)
-- ============================================

begin;

-- ---------- helpers ----------
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- FOLLOW UPS ----------
alter table if exists public.follow_ups
  add column if not exists updated_at timestamptz;

-- ensure user_id_uuid exists and is correct type
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='follow_ups' and column_name='user_id_uuid'
      and data_type <> 'uuid'
  ) then
    raise exception 'follow_ups.user_id_uuid must be uuid';
  end if;
end$$;

-- due_at normalization (prefer due_at; keep due_date if legacy exists)
alter table if exists public.follow_ups
  add column if not exists due_at timestamptz;

-- basic constraints
alter table if exists public.follow_ups
  alter column user_id_uuid set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='follow_ups_user_id_uuid_fkey'
  ) then
    alter table public.follow_ups
      add constraint follow_ups_user_id_uuid_fkey
      foreign key (user_id_uuid) references public.identity_users(id) on delete cascade;
  end if;
end$$;

-- status constraint (soft enum)
do $$
begin
  if not exists (select 1 from pg_constraint where conname='follow_ups_status_chk') then
    alter table public.follow_ups
      add constraint follow_ups_status_chk
      check (status in ('open','snoozed','done'));
  end if;
end$$;

-- updated_at trigger
drop trigger if exists trg_follow_ups_set_updated_at on public.follow_ups;
create trigger trg_follow_ups_set_updated_at
before update on public.follow_ups
for each row execute function public.tg_set_updated_at();

-- indexes
create index if not exists idx_follow_ups_user_due
  on public.follow_ups (user_id_uuid, due_at desc nulls last);

create index if not exists idx_follow_ups_user_status
  on public.follow_ups (user_id_uuid, status);

-- ---------- TASKS ----------
alter table if exists public.tasks
  add column if not exists updated_at timestamptz;

alter table if exists public.tasks
  add column if not exists due_at timestamptz;

alter table if exists public.tasks
  alter column user_id_uuid set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='tasks_user_id_uuid_fkey'
  ) then
    alter table public.tasks
      add constraint tasks_user_id_uuid_fkey
      foreign key (user_id_uuid) references public.identity_users(id) on delete cascade;
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='tasks_status_chk') then
    alter table public.tasks
      add constraint tasks_status_chk
      check (coalesce(status,'open') in ('open','in_progress','blocked','done','archived'));
  end if;
end$$;

drop trigger if exists trg_tasks_set_updated_at on public.tasks;
create trigger trg_tasks_set_updated_at
before update on public.tasks
for each row execute function public.tg_set_updated_at();

create index if not exists idx_tasks_user_due
  on public.tasks (user_id_uuid, due_at desc nulls last);

create index if not exists idx_tasks_user_status
  on public.tasks (user_id_uuid, status);

-- ---------- DEALS ----------
alter table if exists public.deals
  add column if not exists updated_at timestamptz;

alter table if exists public.deals
  alter column user_id_uuid set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='deals_user_id_uuid_fkey'
  ) then
    alter table public.deals
      add constraint deals_user_id_uuid_fkey
      foreign key (user_id_uuid) references public.identity_users(id) on delete cascade;
  end if;
end$$;

drop trigger if exists trg_deals_set_updated_at on public.deals;
create trigger trg_deals_set_updated_at
before update on public.deals
for each row execute function public.tg_set_updated_at();

create index if not exists idx_deals_user_stage
  on public.deals (user_id_uuid, stage);

create index if not exists idx_deals_user_updated
  on public.deals (user_id_uuid, updated_at desc nulls last);

-- ---------- RLS ENABLE ----------
alter table if exists public.follow_ups enable row level security;
alter table if exists public.tasks enable row level security;
alter table if exists public.deals enable row level security;

-- Drop existing policies (idempotent-ish)
do $$
begin
  -- follow_ups
  if exists (select 1 from pg_policies where schemaname='public' and tablename='follow_ups' and policyname='follow_ups_owner_all') then
    execute 'drop policy follow_ups_owner_all on public.follow_ups';
  end if;

  -- tasks
  if exists (select 1 from pg_policies where schemaname='public' and tablename='tasks' and policyname='tasks_owner_all') then
    execute 'drop policy tasks_owner_all on public.tasks';
  end if;

  -- deals
  if exists (select 1 from pg_policies where schemaname='public' and tablename='deals' and policyname='deals_owner_all') then
    execute 'drop policy deals_owner_all on public.deals';
  end if;
end$$;

-- Canon user resolver in SQL (JWT → Clerk ID). Assumes you store Clerk ID in auth.jwt() sub.
-- If your JWT claim differs, update this in ONE place.
create or replace function public.current_clerk_user_id()
returns text
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'sub','');
$$;

create or replace function public.current_user_id_uuid()
returns uuid
language sql
stable
as $$
  select iu.id
  from public.identity_users iu
  where iu.clerk_user_id = public.current_clerk_user_id()
    and iu.is_archived = false
  limit 1;
$$;

-- Policies: owner-only
create policy follow_ups_owner_all
on public.follow_ups
for all
using (user_id_uuid = public.current_user_id_uuid())
with check (user_id_uuid = public.current_user_id_uuid());

create policy tasks_owner_all
on public.tasks
for all
using (user_id_uuid = public.current_user_id_uuid())
with check (user_id_uuid = public.current_user_id_uuid());

create policy deals_owner_all
on public.deals
for all
using (user_id_uuid = public.current_user_id_uuid())
with check (user_id_uuid = public.current_user_id_uuid());

commit;
