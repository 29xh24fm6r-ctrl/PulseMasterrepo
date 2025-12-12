-- Unified Communications Brain v1
-- supabase/migrations/comms_unified_v1.sql

-- Communication Channels
create table if not exists public.comm_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel_type text not null,        -- 'email' | 'sms' | 'call' | 'other'
  external_id text,                  -- e.g. phone number, VOIP session id
  label text,                        -- e.g. '+1-404-123-4567', 'Cell', etc.
  created_at timestamptz default now()
);

create index if not exists comm_channels_user_type_idx
  on public.comm_channels (user_id, channel_type);

create unique index if not exists comm_channels_user_external_idx
  on public.comm_channels (user_id, channel_type, external_id);

-- Communication Messages
create table if not exists public.comm_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel_id uuid not null references comm_channels(id) on delete cascade,
  source_type text not null,         -- 'email' | 'sms' | 'call' | 'note'
  external_id text,                  -- provider-specific id if any
  direction text not null,           -- 'incoming' | 'outgoing'
  from_identity text,                -- email/phone/name
  to_identity text,                  -- email/phone/name or CSV
  occurred_at timestamptz not null,
  subject text,                      -- optional (for calls: summary title)
  body text,                         -- SMS text or call transcript snippet
  raw_data jsonb,                    -- provider payload if needed
  created_at timestamptz default now()
);

create index if not exists comm_messages_user_channel_idx
  on public.comm_messages (user_id, channel_id, occurred_at desc);

create index if not exists comm_messages_source_type_idx
  on public.comm_messages (user_id, source_type, occurred_at desc);

-- Link email to comms (optional)
alter table public.email_threads
  add column if not exists comm_channel_id uuid references comm_channels(id);

alter table public.email_messages
  add column if not exists comm_message_id uuid references comm_messages(id);

-- Link responsibilities to comms
alter table public.email_responsibilities
  add column if not exists comm_message_id uuid references comm_messages(id);

-- Link promises to comms
alter table public.email_promises
  add column if not exists comm_message_id uuid references comm_messages(id);

