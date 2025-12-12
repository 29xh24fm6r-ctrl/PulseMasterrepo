-- Voice Emotion Overrides Migration
-- Allows user-customizable emotion-based voice overrides

create table if not exists public.voice_emotion_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  coach_id text not null,
  emotion text not null,                    -- 'stress', 'sad', 'angry', 'hype', etc.
  override_voice text not null,             -- Voice profile key to use
  speed_override numeric,                   -- Optional speed override
  energy_override numeric,                  -- Optional energy override
  warmth_override numeric,                  -- Optional warmth override
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, coach_id, emotion)
);

create index if not exists voice_emotion_overrides_user_idx
  on public.voice_emotion_overrides (user_id, coach_id, is_active);

create index if not exists voice_emotion_overrides_emotion_idx
  on public.voice_emotion_overrides (emotion, is_active);

