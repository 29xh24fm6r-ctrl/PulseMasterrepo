-- Add reply/thread headers to email_outbox
begin;

alter table if exists public.email_outbox
  add column if not exists in_reply_to text,
  add column if not exists references text[];

-- Helpful index if you later want analytics by thread-ish patterns
create index if not exists email_outbox_in_reply_to_idx
  on public.email_outbox (in_reply_to);

commit;

