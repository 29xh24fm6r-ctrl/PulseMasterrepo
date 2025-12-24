begin;

-- 1) Evidence must always be a JSON object (never a string/array/null)
alter table public.email_triage_items
  alter column evidence set default '{}'::jsonb;

update public.email_triage_items
set evidence = '{}'::jsonb
where evidence is null;

alter table public.email_triage_items
  alter column evidence set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'email_triage_items_evidence_is_object'
  ) then
    alter table public.email_triage_items
      add constraint email_triage_items_evidence_is_object
      check (jsonb_typeof(evidence) = 'object');
  end if;
end $$;

-- 2) Enumerated-ish guards (keep as text, but constrain values)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'email_triage_items_urgency_chk'
  ) then
    alter table public.email_triage_items
      add constraint email_triage_items_urgency_chk
      check (urgency in ('p0','p1','p2','p3'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'email_triage_items_suggested_action_chk'
  ) then
    alter table public.email_triage_items
      add constraint email_triage_items_suggested_action_chk
      check (suggested_action in ('reply','followup','task','ignore'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'email_triage_items_state_chk'
  ) then
    alter table public.email_triage_items
      add constraint email_triage_items_state_chk
      check (state in ('triaged','suggested','done'));
  end if;
end $$;

-- 3) Uniqueness: one triage item per (user, thread)
create unique index if not exists email_triage_items_user_thread_unique
  on public.email_triage_items(user_id, email_thread_id);

-- 4) Useful indexes for inbox queries
create index if not exists email_triage_items_user_state_next_idx
  on public.email_triage_items(user_id, state, next_action_at desc nulls last, updated_at desc);

create index if not exists email_triage_items_user_updated_idx
  on public.email_triage_items(user_id, updated_at desc);

commit;

