-- 20251224_email_outbox_sender_fields.sql
alter table if exists public.email_outbox
  add column if not exists provider_message_id text,
  add column if not exists last_error text;
