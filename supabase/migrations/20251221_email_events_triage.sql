-- Phase 2: Canonical email events table for inbound triage
begin;

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  message_id text,
  from_email text,
  to_email text,
  subject text,
  snippet text,
  received_at timestamptz,
  triage_label text check (triage_label in ('needs_reply', 'request', 'task', 'waiting_on_them', 'fyi')),
  triage_confidence numeric check (triage_confidence >= 0 and triage_confidence <= 1),
  triage_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists email_events_user_direction_idx on public.email_events (user_id, direction);
create index if not exists email_events_message_id_idx on public.email_events (message_id) where message_id is not null;
create index if not exists email_events_triage_label_idx on public.email_events (triage_label) where triage_label is not null;
create index if not exists email_events_received_at_idx on public.email_events (received_at) where received_at is not null;

commit;

