-- 20260102_g5_history_bundle_indexes.sql
-- Ensures the bundle RPC stays fast at scale.

begin;

create index if not exists user_daily_xp_owner_day_idx
  on public.user_daily_xp (owner_user_id, day);

create index if not exists user_daily_momentum_owner_day_idx
  on public.user_daily_momentum (owner_user_id, day);

create index if not exists user_daily_life_score_owner_day_idx
  on public.user_daily_life_score (owner_user_id, day);

commit;
