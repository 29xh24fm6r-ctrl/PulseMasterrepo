-- 20260102_g6_ops_rate_limit_and_audit.sql
-- Adds:
-- 1) ops_rate_limits table + RPC for atomic rate limit checks
-- 2) ops_audit_log table + RPC to append audit events (immutable)
--
-- Service-role only.

begin;

-- =========================================================
-- A) Rate limiting
-- =========================================================
create table if not exists public.ops_rate_limits (
  owner_user_id text not null,
  route_key text not null,                 -- e.g. "GET:/api/signals/daily"
  window_start timestamptz not null,       -- floor(now/window_seconds)*window_seconds
  window_seconds int not null,
  count int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (owner_user_id, route_key, window_start)
);

create index if not exists ops_rate_limits_lookup_idx
  on public.ops_rate_limits (owner_user_id, route_key, window_start desc);

-- Atomic increment + allow/deny
create or replace function public.ops_rate_limit_check(
  p_owner_user_id text,
  p_route_key text,
  p_window_seconds int,
  p_limit int
)
returns table(allowed boolean, remaining int, reset_at timestamptz)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  ws int := greatest(coalesce(p_window_seconds, 60), 1);
  lim int := greatest(coalesce(p_limit, 60), 1);
  wstart timestamptz;
  cur_count int;
  new_count int;
begin
  -- floor timestamp to window boundary
  wstart := to_timestamp(floor(extract(epoch from now()) / ws) * ws);

  insert into public.ops_rate_limits (owner_user_id, route_key, window_start, window_seconds, count)
  values (p_owner_user_id, p_route_key, wstart, ws, 1)
  on conflict (owner_user_id, route_key, window_start)
  do update set
    count = public.ops_rate_limits.count + 1,
    updated_at = now()
  returning count into new_count;

  cur_count := coalesce(new_count, 1);

  if cur_count <= lim then
    return query
      select true, greatest(lim - cur_count, 0), (wstart + make_interval(secs => ws));
  else
    return query
      select false, 0, (wstart + make_interval(secs => ws));
  end if;
end;
$$;

revoke all on table public.ops_rate_limits from public;
revoke all on function public.ops_rate_limit_check(text, text, int, int) from public;

-- =========================================================
-- B) Audit log (immutable append-only)
-- =========================================================
create table if not exists public.ops_audit_log (
  id uuid primary key default gen_random_uuid(),
  owner_user_id text not null,
  route_key text not null,
  method text not null,
  path text not null,
  status int not null,
  duration_ms int not null,
  request_id text null,                   -- correlate across logs/sentry
  ip text null,
  user_agent text null,
  meta jsonb not null default '{}'::jsonb, -- arbitrary safe metadata (e.g. days, cache_hit)
  created_at timestamptz not null default now()
);

create index if not exists ops_audit_log_user_time_idx
  on public.ops_audit_log (owner_user_id, created_at desc);

create index if not exists ops_audit_log_route_time_idx
  on public.ops_audit_log (route_key, created_at desc);

create or replace function public.ops_audit_append(
  p_owner_user_id text,
  p_route_key text,
  p_method text,
  p_path text,
  p_status int,
  p_duration_ms int,
  p_request_id text default null,
  p_ip text default null,
  p_user_agent text default null,
  p_meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.ops_audit_log (
    owner_user_id, route_key, method, path, status, duration_ms, request_id, ip, user_agent, meta
  )
  values (
    p_owner_user_id, p_route_key, p_method, p_path, p_status, p_duration_ms,
    p_request_id, p_ip, p_user_agent, coalesce(p_meta, '{}'::jsonb)
  );
end;
$$;

revoke all on table public.ops_audit_log from public;
revoke all on function public.ops_audit_append(text, text, text, text, int, int, text, text, text, jsonb) from public;

commit;
