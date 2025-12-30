begin;

-- ============================================================
-- A) life_evidence.trace_id
-- ============================================================
alter table public.life_evidence
  add column if not exists trace_id uuid null;

create index if not exists idx_life_evidence_trace
  on public.life_evidence (user_id, trace_id, created_at desc);

-- ============================================================
-- B) tasks.trace_id (ONLY if table exists)
-- ============================================================
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'tasks'
  ) then
    execute 'alter table public.tasks add column if not exists trace_id uuid null;';
    execute 'create index if not exists idx_tasks_trace on public.tasks (user_id, trace_id, created_at desc);';
  end if;
end $$;

-- ============================================================
-- C) email_outbox.trace_id (ONLY if table exists)
-- ============================================================
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'email_outbox'
  ) then
    execute 'alter table public.email_outbox add column if not exists trace_id uuid null;';
    execute 'create index if not exists idx_email_outbox_trace on public.email_outbox (user_id, trace_id, created_at desc);';
  end if;
end $$;

commit;
