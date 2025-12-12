-- Voice Switch Events Migration
-- Tracks voice switching patterns for analytics

create table if not exists public.voice_switch_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  coach_id text not null,
  base_voice text not null,
  final_voice text not null,
  primary_emotion text,
  temporary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists voice_switch_events_user_idx
  on public.voice_switch_events (user_id, created_at desc);

create index if not exists voice_switch_events_coach_idx
  on public.voice_switch_events (coach_id, created_at desc);

create index if not exists voice_switch_events_emotion_idx
  on public.voice_switch_events (primary_emotion, created_at desc);

