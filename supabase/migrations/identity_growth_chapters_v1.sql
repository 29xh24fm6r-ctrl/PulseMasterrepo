-- Identity Growth & Chapters
-- supabase/migrations/identity_growth_chapters_v1.sql

create table if not exists public.identity_state_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  identity_id uuid,                          -- references identity table
  identity_name text,                        -- fallback if identity_id not available
  snapshot_date date not null,
  xp_total int default 0,
  xp_trend_7d numeric,                       -- e.g. % change
  sessions_count int default 0,
  emotions_dominant text[],
  created_at timestamptz default now()
);

create index if not exists identity_snapshots_user_date_idx
  on public.identity_state_snapshots (user_id, snapshot_date desc);

create index if not exists identity_snapshots_identity_idx
  on public.identity_state_snapshots (user_id, identity_name);

create table if not exists public.life_chapters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  start_date date not null,
  end_date date,
  primary_identity_id uuid,                  -- dominant identity
  primary_identity_name text,                -- fallback
  emotion_theme text,                        -- "recovery", "ascent", "storm", etc.
  created_at timestamptz default now()
);

create index if not exists life_chapters_user_date_idx
  on public.life_chapters (user_id, start_date desc);

