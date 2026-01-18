create table if not exists public.exec_runs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  
  run_kind text not null, -- 'web.playwright', 'phone.twilio', 'delivery.track'
  status text not null default 'queued'
    check (status in ('queued','running','succeeded','failed','canceled','retrying')),
    
  request_json jsonb not null,
  result_json jsonb null,
  error_json jsonb null,
  
  idempotency_key text not null,
  attempt int not null default 1,
  max_attempts int not null default 3,
  next_retry_at timestamptz null,
  
  locked_at timestamptz null,
  locked_by text null,
  trace_id text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.exec_runs enable row level security;

create policy "exec_runs_owner"
on public.exec_runs
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create unique index if not exists exec_runs_idempotency_idx 
on public.exec_runs (owner_user_id, idempotency_key);

create table if not exists public.exec_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.exec_runs(id) on delete cascade,
  event_name text not null,
  detail_json jsonb null,
  created_at timestamptz not null default now()
);

alter table public.exec_steps enable row level security;

create policy "exec_steps_owner"
on public.exec_steps
for select
using (
  exists (
    select 1 from public.exec_runs r
    where r.id = exec_steps.run_id
    and r.owner_user_id = auth.uid()
  )
);

create table if not exists public.exec_outbox (
  id uuid primary key default gen_random_uuid(),
  
  job_kind text not null,
  payload_json jsonb not null,
  status text not null default 'ready'
     check (status in ('ready','running','done','dead','retrying')),
     
  run_id uuid references public.exec_runs(id) on delete cascade,
  
  idempotency_key text not null unique,
  
  attempt int not null default 1,
  max_attempts int not null default 6,
  next_retry_at timestamptz null,
  
  locked_at timestamptz null,
  locked_by text null,
  last_error_json jsonb null,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.exec_outbox enable row level security;
-- Service role only for processing

create table if not exists public.delivery_trackers (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  
  provider text not null,
  external_tracking_id text not null,
  status text not null default 'unknown',
  
  last_checked_at timestamptz null,
  next_check_at timestamptz null,
  latest_json jsonb null,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.delivery_trackers enable row level security;

create policy "delivery_trackers_owner"
on public.delivery_trackers
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());
