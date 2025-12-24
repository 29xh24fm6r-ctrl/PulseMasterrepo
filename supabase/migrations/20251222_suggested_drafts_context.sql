-- Suggested drafts: add context + why
alter table if exists public.email_suggested_drafts
  add column if not exists context jsonb,
  add column if not exists why text;

-- Outbox: add send_intent
alter table if exists public.email_outbox
  add column if not exists send_intent text;

-- Optional: constrain send_intent if you want guardrails
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='email_outbox'
      and column_name='send_intent'
  ) then
    begin
      alter table public.email_outbox
        add constraint email_outbox_send_intent_check
        check (send_intent is null or send_intent in ('safe','real'));
    exception when duplicate_object then
      null;
    end;
  end if;
end$$;

