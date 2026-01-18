begin;

-- A single-row-per-key lock with TTL.
-- Prevents concurrent cron invocations from stampeding the worker.

create table if not exists public.cron_locks (
  key text primary key,
  locked_until timestamptz not null,
  holder text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists tr_cron_locks_updated_at on public.cron_locks;
create trigger tr_cron_locks_updated_at
before update on public.cron_locks
for each row execute function public.tg_set_updated_at();

alter table public.cron_locks enable row level security;

-- Only server/admin should touch these; no user policies.

-- Acquire lock (idempotent): returns true if acquired.
create or replace function public.rpc_cron_try_lock(
  p_key text,
  p_ttl_seconds int,
  p_holder text default null
) returns boolean
language plpgsql
security definer
as $$
declare
  v_now timestamptz := now();
  v_until timestamptz := v_now + make_interval(secs => greatest(1, p_ttl_seconds));
begin
  -- Try insert first
  insert into public.cron_locks(key, locked_until, holder)
  values (p_key, v_until, p_holder)
  on conflict (key) do nothing;

  -- If exists and expired, take it
  update public.cron_locks
  set locked_until = v_until,
      holder = p_holder
  where key = p_key
    and locked_until <= v_now;

  -- Acquired if lock is ours and not expired
  return exists (
    select 1 from public.cron_locks
    where key = p_key
      and locked_until > v_now
      and (p_holder is null or holder = p_holder)
  );
end;
$$;

-- Release lock early (optional)
create or replace function public.rpc_cron_release_lock(
  p_key text
) returns boolean
language plpgsql
security definer
as $$
begin
  update public.cron_locks
  set locked_until = now()
  where key = p_key;
  return found;
end;
$$;

commit;
