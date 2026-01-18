begin;

create extension if not exists pgcrypto;

-- ============================================================
-- ARTIFACT LINKS (append-only provenance graph)
-- ============================================================
create table if not exists public.artifact_links (
  id uuid primary key default gen_random_uuid(),

  user_id text not null,

  -- correlation
  trace_id uuid null,
  execution_id uuid null,
  execution_run_id uuid null,

  -- source artifact
  from_type text not null,     -- e.g. "execution", "execution_run", "email_outbox", "life_evidence", "task"
  from_id uuid null,
  from_key text null,          -- if an artifact isn't UUID-backed, store stable key

  -- relationship
  relation text not null,      -- e.g. "created", "evaluated", "queued", "sent", "derived", "linked"
  meta jsonb not null default '{}'::jsonb,

  -- target artifact
  to_type text not null,
  to_id uuid null,
  to_key text null,

  created_at timestamptz not null default now()
);

create index if not exists idx_artifact_links_trace
  on public.artifact_links (user_id, trace_id, created_at desc);

create index if not exists idx_artifact_links_exec
  on public.artifact_links (user_id, execution_id, created_at desc);

create index if not exists idx_artifact_links_run
  on public.artifact_links (user_id, execution_run_id, created_at desc);

create index if not exists idx_artifact_links_from
  on public.artifact_links (user_id, from_type, from_id, created_at desc);

create index if not exists idx_artifact_links_to
  on public.artifact_links (user_id, to_type, to_id, created_at desc);

alter table public.artifact_links enable row level security;

drop policy if exists "artifact_links_select_own" on public.artifact_links;
create policy "artifact_links_select_own"
on public.artifact_links for select
using (user_id = auth.uid());

-- append-only inserts for the owning user (client)
drop policy if exists "artifact_links_insert_own" on public.artifact_links;
create policy "artifact_links_insert_own"
on public.artifact_links for insert
with check (user_id = auth.uid());

-- prevent updates/deletes (append-only)
drop policy if exists "artifact_links_no_update" on public.artifact_links;
create policy "artifact_links_no_update"
on public.artifact_links for update using (false);

drop policy if exists "artifact_links_no_delete" on public.artifact_links;
create policy "artifact_links_no_delete"
on public.artifact_links for delete using (false);

-- ============================================================
-- RPC: server-safe insert (security definer) so admin routes can write links
-- ============================================================
create or replace function public.rpc_artifact_link_insert(
  p_user_id text,
  p_trace_id uuid,
  p_execution_id uuid,
  p_execution_run_id uuid,
  p_from_type text,
  p_from_id uuid,
  p_from_key text,
  p_relation text,
  p_meta jsonb,
  p_to_type text,
  p_to_id uuid,
  p_to_key text
) returns uuid
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  insert into public.artifact_links(
    user_id, trace_id, execution_id, execution_run_id,
    from_type, from_id, from_key,
    relation, meta,
    to_type, to_id, to_key
  )
  values (
    p_user_id, p_trace_id, p_execution_id, p_execution_run_id,
    p_from_type, p_from_id, p_from_key,
    p_relation, coalesce(p_meta,'{}'::jsonb),
    p_to_type, p_to_id, p_to_key
  )
  returning id into v_id;

  return v_id;
end;
$$;

commit;
