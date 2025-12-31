begin;

-- =========================================================
-- Reply Drafts (Stub, no send yet)
-- =========================================================
create table if not exists public.reply_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id_uuid uuid not null references public.identity_users(id) on delete cascade,
  inbox_item_id uuid not null references public.inbox_items(id) on delete cascade,

  subject text,
  body text not null default '',
  status text not null default 'draft', -- draft | ready | sent | archived
  meta jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- one draft per inbox item (V1)
create unique index if not exists uq_reply_drafts_one_per_item
  on public.reply_drafts (user_id_uuid, inbox_item_id)
  where status <> 'archived';

create index if not exists idx_reply_drafts_user_updated
  on public.reply_drafts (user_id_uuid, updated_at desc);

do $$
begin
  if not exists (select 1 from pg_constraint where conname='reply_drafts_status_chk') then
    alter table public.reply_drafts
      add constraint reply_drafts_status_chk
      check (status in ('draft','ready','sent','archived'));
  end if;
end$$;

drop trigger if exists trg_reply_drafts_set_updated_at on public.reply_drafts;
create trigger trg_reply_drafts_set_updated_at
before update on public.reply_drafts
for each row execute function public.tg_set_updated_at();

alter table public.reply_drafts enable row level security;

do $$
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='reply_drafts' and policyname='reply_drafts_owner_all') then
    execute 'drop policy reply_drafts_owner_all on public.reply_drafts';
  end if;
end$$;

create policy reply_drafts_owner_all
on public.reply_drafts
for all
using (user_id_uuid = public.current_user_id_uuid())
with check (user_id_uuid = public.current_user_id_uuid());

commit;
