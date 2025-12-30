begin;

create extension if not exists pgcrypto;

create table if not exists public.ops_audit_log (
  id uuid primary key default gen_random_uuid(),

  -- who performed the ops action
  actor_user_id text not null,            -- typically Clerk user id stored as text
  actor_is_admin boolean not null default false,

  -- who the action targeted (optional)
  target_user_id text null,

  -- what happened
  action text not null,                   -- e.g. "trace.search", "trace.view", "trace.replay", "execution.cancel"
  resource_type text null,                -- e.g. "trace", "execution"
  resource_id text null,                  -- e.g. trace_id (uuid string), execution_id

  meta jsonb not null default '{}'::jsonb,

  -- request context (best-effort)
  ip text null,
  user_agent text null,

  created_at timestamptz not null default now()
);

create index if not exists idx_ops_audit_log_actor_time
  on public.ops_audit_log (actor_user_id, created_at desc);

create index if not exists idx_ops_audit_log_target_time
  on public.ops_audit_log (target_user_id, created_at desc);

create index if not exists idx_ops_audit_log_action_time
  on public.ops_audit_log (action, created_at desc);

create index if not exists idx_ops_audit_log_resource
  on public.ops_audit_log (resource_type, resource_id);

alter table public.ops_audit_log enable row level security;

-- Users can view their own ops activity
drop policy if exists "ops_audit_select_own" on public.ops_audit_log;
create policy "ops_audit_select_own"
on public.ops_audit_log
for select
using (actor_user_id = auth.uid());

-- No client inserts/updates/deletes (server only)
drop policy if exists "ops_audit_no_insert" on public.ops_audit_log;
create policy "ops_audit_no_insert"
on public.ops_audit_log for insert
with check (false);

drop policy if exists "ops_audit_no_update" on public.ops_audit_log;
create policy "ops_audit_no_update"
on public.ops_audit_log for update using (false);

drop policy if exists "ops_audit_no_delete" on public.ops_audit_log;
create policy "ops_audit_no_delete"
on public.ops_audit_log for delete using (false);

-- Server RPC insert (security definer) so Next.js server can write audit logs
create or replace function public.rpc_ops_audit_insert(
  p_actor_user_id text,
  p_actor_is_admin boolean,
  p_target_user_id text,
  p_action text,
  p_resource_type text,
  p_resource_id text,
  p_meta jsonb,
  p_ip text,
  p_user_agent text
) returns uuid
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  insert into public.ops_audit_log(
    actor_user_id, actor_is_admin, target_user_id,
    action, resource_type, resource_id,
    meta, ip, user_agent
  )
  values (
    p_actor_user_id, coalesce(p_actor_is_admin,false), p_target_user_id,
    p_action, p_resource_type, p_resource_id,
    coalesce(p_meta,'{}'::jsonb), p_ip, p_user_agent
  )
  returning id into v_id;

  return v_id;
end;
$$;

commit;
