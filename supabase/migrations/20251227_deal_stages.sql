begin;

create table if not exists public.deal_stages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id_uuid uuid not null,
  key text not null,
  label text not null,
  sort_order int not null default 0,
  meta jsonb not null default '{}'::jsonb,
  unique(user_id_uuid, key)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'deal_stages_user_id_uuid_fkey'
  ) then
    alter table public.deal_stages
      add constraint deal_stages_user_id_uuid_fkey
      foreign key (user_id_uuid) references public.identity_users(id)
      on delete cascade;
  end if;
end $$;

create index if not exists idx_deal_stages_user_id_uuid on public.deal_stages(user_id_uuid);

commit;
