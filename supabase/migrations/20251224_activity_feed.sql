-- 20251224_activity_feed.sql
-- Persistent Activity Feed (auditable log of user-visible system actions)

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- If you already have canonical user ids, populate this from your API later.
  user_id text null,

  -- Where it came from (home, capture, email, etc)
  source text not null default 'system',

  -- Stable event type enum-ish string (e.g., capture.created, email.approved)
  event_type text not null,

  -- Short human-readable title for UI
  title text not null,

  -- Optional longer description
  detail text null,

  -- Flexible JSON payload for future expansion (ids, metadata)
  payload jsonb not null default '{}'::jsonb
);

create index if not exists activity_events_created_at_idx
  on public.activity_events (created_at desc);

create index if not exists activity_events_event_type_idx
  on public.activity_events (event_type);

create index if not exists activity_events_user_id_created_at_idx
  on public.activity_events (user_id, created_at desc);
