alter table if exists public.email_events
  add column if not exists in_reply_to text,
  add column if not exists references text[];

