begin;

-- =========================================================
-- 1) REPAIR ops_audit_log schema (add missing columns safely)
-- =========================================================
alter table public.ops_audit_log
  add column if not exists owner_user_id text,
  add column if not exists route_key text,
  add column if not exists method text,
  add column if not exists path text,
  add column if not exists status int,
  add column if not exists duration_ms int,
  add column if not exists request_id text,
  add column if not exists ip text,
  add column if not exists user_agent text,
  add column if not exists meta jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now();

-- If the table existed but lacked these indexes, add them.
create index if not exists ops_audit_log_user_time_idx
  on public.ops_audit_log (owner_user_id, created_at desc);

create index if not exists ops_audit_log_route_time_idx
  on public.ops_audit_log (route_key, created_at desc);

-- =========================================================
-- 2) Recreate ops_audit_append (immutable append)
-- =========================================================
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
    owner_user_id, route_key, method, path, status, duration_ms,
    request_id, ip, user_agent, meta, created_at
  )
  values (
    p_owner_user_id, p_route_key, p_method, p_path, p_status, p_duration_ms,
    p_request_id, p_ip, p_user_agent, coalesce(p_meta, '{}'::jsonb), now()
  );
end;
$$;

revoke all on function public.ops_audit_append(text, text, text, text, int, int, text, text, text, jsonb) from public;

-- =========================================================
-- 3) Recreate ops_audit_read (viewer RPC)
-- =========================================================
create or replace function public.ops_audit_read(
  p_owner_user_id text default null,
  p_route_key text default null,
  p_status int default null,
  p_since timestamptz default null,
  p_limit int default 200
)
returns table(
  id uuid,
  owner_user_id text,
  route_key text,
  method text,
  path text,
  status int,
  duration_ms int,
  request_id text,
  ip text,
  user_agent text,
  meta jsonb,
  created_at timestamptz
)
language sql
security definer
set search_path to 'public'
as $$
  select
    a.id,
    a.owner_user_id,
    a.route_key,
    a.method,
    a.path,
    a.status,
    a.duration_ms,
    a.request_id,
    a.ip,
    a.user_agent,
    a.meta,
    a.created_at
  from public.ops_audit_log a
  where (p_owner_user_id is null or a.owner_user_id = p_owner_user_id)
    and (p_route_key is null or a.route_key = p_route_key)
    and (p_status is null or a.status = p_status)
    and (p_since is null or a.created_at >= p_since)
  order by a.created_at desc
  limit greatest(least(coalesce(p_limit, 200), 1000), 1);
$$;

revoke all on function public.ops_audit_read(text, text, int, timestamptz, int) from public;

commit;
