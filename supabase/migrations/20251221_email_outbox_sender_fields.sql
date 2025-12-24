begin;

alter table if exists public.email_outbox
  add column if not exists provider text,
  add column if not exists provider_message_id text,
  add column if not exists last_error text,
  add column if not exists sent_at timestamptz;

-- optional but helpful for worker scanning
create index if not exists email_outbox_status_created_idx
  on public.email_outbox (status, created_at);

commit;

