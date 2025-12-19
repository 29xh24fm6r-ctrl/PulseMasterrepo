-- Migration: feature_canary_runs table for canary test results
-- Created: 2025-12-18

create table if not exists feature_canary_runs (
  id uuid primary key default gen_random_uuid(),
  feature_id text not null,
  ok boolean not null,
  severity text not null default 'ok',
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Index for quick lookups by feature_id
create index if not exists idx_feature_canary_runs_feature_id on feature_canary_runs(feature_id);

-- Index for latest results per feature
create index if not exists idx_feature_canary_runs_feature_created on feature_canary_runs(feature_id, created_at desc);

-- RLS policies (admin-only write, users can read their own feature results)
alter table feature_canary_runs enable row level security;

create policy "Users can read canary results"
  on feature_canary_runs
  for select
  using (true); -- Canary results are non-sensitive operational data

create policy "Only service role can insert canary results"
  on feature_canary_runs
  for insert
  with check (false); -- Only service role (bypasses RLS) can insert

-- Optional: cleanup old runs (keep last 30 days)
-- You can add a cron job or scheduled task to run:
-- DELETE FROM feature_canary_runs WHERE created_at < now() - interval '30 days';

