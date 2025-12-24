-- Phase 1: Auto-fix tracking for failed emails
begin;

alter table if exists public.email_outbox
  add column if not exists failure_code text,
  add column if not exists auto_fix_suggested boolean not null default false,
  add column if not exists auto_fix_payload jsonb;

create index if not exists email_outbox_failure_code_idx on public.email_outbox (failure_code) where failure_code is not null;
create index if not exists email_outbox_auto_fix_idx on public.email_outbox (auto_fix_suggested) where auto_fix_suggested = true;

commit;

