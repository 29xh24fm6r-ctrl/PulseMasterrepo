-- Coaching Sessions & Turns Migration
-- Tracks complete coaching sessions with emotional timeline

create table if not exists public.coaching_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  coach_id text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  emotion_start text,
  emotion_end text,
  xp_earned int not null default 0,
  total_turns int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists coaching_sessions_user_idx
  on public.coaching_sessions (user_id, coach_id, started_at desc);

create index if not exists coaching_sessions_active_idx
  on public.coaching_sessions (user_id, coach_id, ended_at)
  where ended_at is null;

create table if not exists public.coaching_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references coaching_sessions(id) on delete cascade,
  turn_index int not null,
  user_message text,
  coach_reply text,
  emotion text,
  intent text,
  voice_id text,
  rationale text,
  xp_earned int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists coaching_turns_session_idx
  on public.coaching_turns (session_id, turn_index);

create index if not exists coaching_turns_emotion_idx
  on public.coaching_turns (emotion, created_at desc);

