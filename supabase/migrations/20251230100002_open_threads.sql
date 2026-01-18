-- supabase/migrations/20251230_open_threads.sql
-- Pulse OS: Open Threads foundation (relationship-centric follow-up loop)

create extension if not exists pgcrypto;

create table if not exists public.open_threads (
  id uuid primary key default gen_random_uuid(),
  user_id_uuid uuid not null,
  thread_key text not null, -- stable idempotency key (e.g. "email:<inbox_item_id>" or "manual:<hash>")
  counterpart_email text,
  counterpart_name text,

  -- Lightweight human context (NOT deal ops)
  -- Examples: {"topic":"Schedule call","last_discussed":"pricing", "notes":"prefers text", "tags":["client","warm"]}
  context jsonb not null default '{}'::jsonb,

  status text not null default 'open', -- open | closed | snoozed
  last_incoming_at timestamptz,
  last_outgoing_at timestamptz,
  last_nudge_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint open_threads_thread_key_unique unique (user_id_uuid, thread_key)
);

create index if not exists open_threads_user_status_idx
  on public.open_threads (user_id_uuid, status);

create index if not exists open_threads_user_counterpart_idx
  on public.open_threads (user_id_uuid, counterpart_email);

create table if not exists public.open_thread_events (
  id uuid primary key default gen_random_uuid(),
  user_id_uuid uuid not null,
  thread_id uuid not null references public.open_threads(id) on delete cascade,
  event_type text not null, -- created | draft_suggested | sent | incoming_seen | nudged | closed | snoozed | reopened
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists open_thread_events_thread_idx
  on public.open_thread_events (thread_id, created_at desc);

-- updated_at trigger (safe + simple)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_open_threads_updated_at on public.open_threads;
create trigger trg_open_threads_updated_at
before update on public.open_threads
for each row execute function public.set_updated_at();

-- RLS: lock down to service role only (matches your orchestration style)
alter table public.open_threads enable row level security;
alter table public.open_thread_events enable row level security;

do $$
begin
  -- If you already use service_role-only tables, keep consistent.
  -- We allow no anon/auth access; worker uses supabaseAdmin.
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='open_threads'
  ) then
    create policy "service_role_only_open_threads"
      on public.open_threads
      for all
      using (false)
      with check (false);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='open_thread_events'
  ) then
    create policy "service_role_only_open_thread_events"
      on public.open_thread_events
      for all
      using (false)
      with check (false);
  end if;
end $$;
