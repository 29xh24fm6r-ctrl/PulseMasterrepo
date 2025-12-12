-- Coach Hub - Shared Insights
-- supabase/migrations/coach_hub_v1.sql

create table if not exists public.coach_shared_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  coach_id text,                               -- coach that generated this insight
  title text not null,
  body text not null,
  tags text[],                                 -- ["sales", "confidence", "pipeline"]
  importance numeric default 0.5,              -- 0–1
  created_at timestamptz default now()
);

create index if not exists coach_insights_user_idx
  on public.coach_shared_insights (user_id, importance desc, created_at desc);

create index if not exists coach_insights_coach_idx
  on public.coach_shared_insights (user_id, coach_id);

create index if not exists coach_insights_tags_idx
  on public.coach_shared_insights using gin (tags);

