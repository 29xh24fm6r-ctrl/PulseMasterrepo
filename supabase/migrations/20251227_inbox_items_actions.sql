begin;

create table if not exists public.inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id_uuid uuid not null references public.identity_users(id) on delete cascade,

  -- source identifiers (gmail/message-id/thread-id etc)
  source text not null default 'manual',
  source_thread_id text,
  source_message_id text,

  from_email text,
  from_name text,
  subject text,
  snippet text,
  body text,

  received_at timestamptz,
  is_unread boolean not null default true,
  is_archived boolean not null default false,

  meta jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_inbox_items_user_unread
  on public.inbox_items (user_id_uuid, is_unread, received_at desc nulls last);

create index if not exists idx_inbox_items_user_archived
  on public.inbox_items (user_id_uuid, is_archived, received_at desc nulls last);

-- de-dupe per source
create unique index if not exists uq_inbox_items_source_msg
  on public.inbox_items (user_id_uuid, source, source_message_id)
  where source_message_id is not null;

drop trigger if exists trg_inbox_items_set_updated_at on public.inbox_items;
create trigger trg_inbox_items_set_updated_at
before update on public.inbox_items
for each row execute function public.tg_set_updated_at();

alter table public.inbox_items enable row level security;

do $$
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='inbox_items' and policyname='inbox_items_owner_all') then
    execute 'drop policy inbox_items_owner_all on public.inbox_items';
  end if;
end$$;

create policy inbox_items_owner_all
on public.inbox_items
for all
using (user_id_uuid = public.current_user_id_uuid())
with check (user_id_uuid = public.current_user_id_uuid());

-- action log for auditability (turn inbox into follow-up/task)
create table if not exists public.inbox_actions (
  id uuid primary key default gen_random_uuid(),
  user_id_uuid uuid not null references public.identity_users(id) on delete cascade,
  inbox_item_id uuid not null references public.inbox_items(id) on delete cascade,
  action_type text not null, -- 'create_follow_up' | 'create_task' | 'archive' | 'mark_read' | ...
  target_table text,
  target_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_inbox_actions_user_time
  on public.inbox_actions (user_id_uuid, created_at desc);

commit;
