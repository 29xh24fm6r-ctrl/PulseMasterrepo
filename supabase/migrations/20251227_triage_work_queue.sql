begin;

-- 1) Inbox triage fields (idempotent)
alter table public.inbox_items
  add column if not exists triage_status text not null default 'new',      -- new | needs_reply | to_do | waiting | done | ignored
  add column if not exists triage_priority text not null default 'normal', -- low | normal | high
  add column if not exists suggested_action text,                          -- 'create_task' | 'create_follow_up' | 'reply' | 'archive' | null
  add column if not exists suggested_due_at timestamptz,
  add column if not exists triaged_at timestamptz,
  add column if not exists triage_meta jsonb not null default '{}'::jsonb;

-- 2) Constraints (soft enums)
do $$
begin
  if not exists (select 1 from pg_constraint where conname='inbox_items_triage_status_chk') then
    alter table public.inbox_items
      add constraint inbox_items_triage_status_chk
      check (triage_status in ('new','needs_reply','to_do','waiting','done','ignored'));
  end if;

  if not exists (select 1 from pg_constraint where conname='inbox_items_triage_priority_chk') then
    alter table public.inbox_items
      add constraint inbox_items_triage_priority_chk
      check (triage_priority in ('low','normal','high'));
  end if;
end $$;

-- 3) Indexes for queue queries
create index if not exists idx_inbox_items_user_triage
  on public.inbox_items (user_id_uuid, triage_status, received_at desc nulls last);

create index if not exists idx_inbox_items_user_priority
  on public.inbox_items (user_id_uuid, triage_priority, received_at desc nulls last);

-- 4) Audit trail: triage events
create table if not exists public.inbox_triage_events (
  id uuid primary key default gen_random_uuid(),
  user_id_uuid uuid not null references public.identity_users(id) on delete cascade,
  inbox_item_id uuid not null references public.inbox_items(id) on delete cascade,

  event_type text not null, -- 'set_status' | 'set_priority' | 'set_suggestion' | 'converted' | 'archived' | 'marked_read'
  from_value text,
  to_value text,
  meta jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists idx_inbox_triage_events_user_time
  on public.inbox_triage_events (user_id_uuid, created_at desc);

alter table public.inbox_triage_events enable row level security;

do $$
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='inbox_triage_events' and policyname='inbox_triage_events_owner_all') then
    execute 'drop policy inbox_triage_events_owner_all on public.inbox_triage_events';
  end if;
end $$;

create policy inbox_triage_events_owner_all
on public.inbox_triage_events
for all
using (user_id_uuid = public.current_user_id_uuid())
with check (user_id_uuid = public.current_user_id_uuid());

commit;
