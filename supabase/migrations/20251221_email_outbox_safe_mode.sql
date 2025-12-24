-- 20251221_email_outbox_safe_mode.sql

begin;

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  user_id uuid null,
  email_thread_id text not null,

  -- recipient + content
  to_email text not null,
  subject text not null,
  body_text text not null,

  -- SAFE MODE fields
  safe_checksum text not null,
  safe_mode boolean not null default true,

  -- status
  status text not null default 'queued', -- queued | sent | failed | canceled
  error text null,

  -- evidence (jsonb)
  evidence jsonb not null default '{}'::jsonb
);

create index if not exists email_outbox_thread_idx on public.email_outbox (email_thread_id);
create index if not exists email_outbox_status_idx on public.email_outbox (status);

create table if not exists public.email_drafts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  user_id uuid null,
  email_thread_id text not null,

  to_email text not null,
  subject text not null,
  body_text text not null,

  safe_checksum text not null,
  evidence jsonb not null default '{}'::jsonb
);

create index if not exists email_drafts_thread_idx on public.email_drafts (email_thread_id);

commit;

