-- Daily Operating Rhythm
-- supabase/migrations/daily_rhythm_v1.sql

create table if not exists public.daily_rhythm_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  type text not null,                    -- "morning_briefing", "midday_checkin", "evening_debrief"
  summary text,                          -- rendered text shown to user
  data jsonb,                            -- structured payload: risks, wins, identity, etc.
  created_at timestamptz default now()
);

create unique index if not exists daily_rhythm_unique
  on public.daily_rhythm_entries (user_id, date, type);

create index if not exists daily_rhythm_user_date_idx
  on public.daily_rhythm_entries (user_id, date desc);

create table if not exists public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,              -- Monday of that ISO week
  summary text,
  data jsonb,
  created_at timestamptz default now()
);

create unique index if not exists weekly_reviews_unique
  on public.weekly_reviews (user_id, week_start);

create index if not exists weekly_reviews_user_week_idx
  on public.weekly_reviews (user_id, week_start desc);

