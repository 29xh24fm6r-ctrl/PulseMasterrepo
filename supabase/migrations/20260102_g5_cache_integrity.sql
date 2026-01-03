begin;

alter table public.user_daily_signals_cache
  add column if not exists source_hash text,
  add column if not exists expires_at timestamptz,
  add column if not exists is_stale boolean not null default false;

create index if not exists user_daily_signals_cache_stale_idx
  on public.user_daily_signals_cache (owner_user_id, is_stale, day desc);

commit;
