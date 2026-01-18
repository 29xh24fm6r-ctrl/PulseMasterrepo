begin;

-- 1) Ensure canonical user column is enforced
alter table public.follow_ups
  alter column user_id_uuid set not null;

-- FK to identity_users(id) (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'follow_ups_user_id_uuid_fkey'
  ) then
    alter table public.follow_ups
      add constraint follow_ups_user_id_uuid_fkey
      foreign key (user_id_uuid) references public.identity_users(id)
      on delete cascade;
  end if;
end $$;

-- 2) Canonical “due” normalization:
-- you currently have BOTH due_date and due_at; make due_at canonical and backfill it from due_date where missing
update public.follow_ups
set due_at = due_date
where due_at is null and due_date is not null;

-- 3) Indexes
create index if not exists idx_followups_user_id_uuid on public.follow_ups(user_id_uuid);
create index if not exists idx_followups_due_at on public.follow_ups(due_at);

-- 4) updated_at trigger helper (idempotent)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_follow_ups_updated_at on public.follow_ups;
create trigger trg_follow_ups_updated_at
before update on public.follow_ups
for each row execute function public.set_updated_at();

commit;
