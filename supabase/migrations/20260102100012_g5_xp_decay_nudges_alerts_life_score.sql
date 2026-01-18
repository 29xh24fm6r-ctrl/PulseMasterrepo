-- 20260102_g5_xp_decay_nudges_alerts_life_score.sql
-- Adds:
-- - XP weighting on rollups
-- - Habit decay curves
-- - Momentum nudges
-- - Predictive streak loss alerts
-- - Rollup-driven Life Score
--
-- Assumes you already have:
-- public.rollup_definitions
-- public.rollup_values
-- public.user_streaks
-- public.job_metrics (optional)

begin;

-- =========================================================
-- G5-A) XP WEIGHTING CONFIG
-- =========================================================
create table if not exists public.rollup_xp_weights (
  rollup_key text primary key,
  xp_per_unit numeric not null default 0,          -- e.g. 5 XP per event
  daily_cap_xp numeric not null default 50,        -- cap XP earned per day for this rollup
  min_value_for_xp numeric not null default 1,     -- threshold
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

-- =========================================================
-- G5-B) HABIT DECAY CURVES
-- =========================================================
-- Decay applies when activity is missing; higher half_life_days = slower decay.
create table if not exists public.rollup_decay_rules (
  rollup_key text primary key,
  model text not null check (model in ('none','half_life','linear')),
  half_life_days numeric null,         -- used if model='half_life'
  linear_per_day numeric null,         -- used if model='linear' (value deducted per day missing)
  floor numeric not null default 0,    -- minimum decayed value
  updated_at timestamptz not null default now()
);

-- =========================================================
-- G5-C) MOMENTUM / LIFE SCORE OUTPUT TABLES
-- =========================================================
create table if not exists public.user_daily_xp (
  owner_user_id text not null,
  day date not null,
  xp numeric not null default 0,
  computed_at timestamptz not null default now(),
  primary key (owner_user_id, day)
);

create table if not exists public.user_daily_momentum (
  owner_user_id text not null,
  day date not null,
  momentum numeric not null default 0,      -- 0..100 scaled
  raw_score numeric not null default 0,     -- internal
  computed_at timestamptz not null default now(),
  primary key (owner_user_id, day)
);

create table if not exists public.user_daily_life_score (
  owner_user_id text not null,
  day date not null,
  life_score numeric not null default 0,    -- 0..100 scaled
  computed_at timestamptz not null default now(),
  primary key (owner_user_id, day)
);

create index if not exists user_daily_xp_idx on public.user_daily_xp (owner_user_id, day desc);
create index if not exists user_daily_momentum_idx on public.user_daily_momentum (owner_user_id, day desc);
create index if not exists user_daily_life_score_idx on public.user_daily_life_score (owner_user_id, day desc);

-- =========================================================
-- G5-D) NUDGES (CONFIG + OUTBOX)
-- =========================================================
create table if not exists public.nudge_templates (
  id uuid primary key default gen_random_uuid(),
  nudge_key text not null unique,
  title text not null,
  body text not null,
  severity text not null check (severity in ('low','med','high')),
  cooldown_hours int not null default 24,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_nudges (
  id uuid primary key default gen_random_uuid(),
  owner_user_id text not null,
  nudge_key text not null,
  day date not null,
  title text not null,
  body text not null,
  severity text not null,
  shown_at timestamptz null,
  dismissed_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists user_nudges_user_day_idx on public.user_nudges (owner_user_id, day desc);

-- =========================================================
-- G5-E) PREDICTIVE STREAK LOSS ALERTS
-- =========================================================
create table if not exists public.streak_alert_rules (
  rollup_key text primary key,
  risk_threshold numeric not null default 0.65,  -- 0..1
  notify_cooldown_hours int not null default 24,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.streak_alerts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id text not null,
  rollup_key text not null,
  day date not null,
  risk numeric not null,        -- 0..1
  reason text not null,
  sent_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists streak_alerts_user_day_idx on public.streak_alerts (owner_user_id, day desc);

-- =========================================================
-- G5-F) HELPERS: DECAY FUNCTION
-- =========================================================
create or replace function public.apply_decay(
  p_rollup_key text,
  p_value numeric,
  p_days_missing int
)
returns numeric
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r public.rollup_decay_rules;
  v numeric := coalesce(p_value, 0);
  d int := greatest(coalesce(p_days_missing, 0), 0);
  outv numeric;
begin
  select * into r from public.rollup_decay_rules where rollup_key = p_rollup_key;

  if not found or r.model = 'none' or d = 0 then
    return greatest(v, 0);
  end if;

  if r.model = 'half_life' then
    if r.half_life_days is null or r.half_life_days <= 0 then
      return greatest(v, r.floor);
    end if;
    -- exponential decay: v * 0.5^(d/half_life)
    outv := v * power(0.5, (d::numeric / r.half_life_days));
    return greatest(outv, r.floor);
  end if;

  if r.model = 'linear' then
    if r.linear_per_day is null then
      return greatest(v, r.floor);
    end if;
    outv := v - (r.linear_per_day * d);
    return greatest(outv, r.floor);
  end if;

  return greatest(v, r.floor);
end;
$$;

revoke all on function public.apply_decay(text, numeric, int) from public;

-- =========================================================
-- G5-G) DAILY XP COMPUTE (FROM rollup_values + weights)
-- =========================================================
create or replace function public.compute_daily_xp(
  p_owner_user_id text,
  p_day date
)
returns numeric
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_day date := coalesce(p_day, now()::date);
  total_xp numeric := 0;
begin
  -- XP = sum(min(value, cap_units)*xp_per_unit), with daily cap_xp applied per rollup
  -- cap_units = daily_cap_xp / xp_per_unit (if xp_per_unit > 0)
  with v as (
    select
      rv.rollup_key,
      rv.value::numeric as value,
      w.xp_per_unit,
      w.daily_cap_xp,
      w.min_value_for_xp
    from public.rollup_values rv
    join public.rollup_xp_weights w
      on w.rollup_key = rv.rollup_key
     and w.is_active = true
    where rv.owner_user_id = p_owner_user_id
      and rv.window_start = v_day
  ),
  per_rollup as (
    select
      rollup_key,
      case
        when xp_per_unit <= 0 then 0
        when value < min_value_for_xp then 0
        else least(value * xp_per_unit, daily_cap_xp)
      end as xp
    from v
  )
  select coalesce(sum(xp), 0) into total_xp from per_rollup;

  insert into public.user_daily_xp (owner_user_id, day, xp)
  values (p_owner_user_id, v_day, total_xp)
  on conflict (owner_user_id, day)
  do update set xp = excluded.xp, computed_at = now();

  return total_xp;
end;
$$;

revoke all on function public.compute_daily_xp(text, date) from public;

-- =========================================================
-- G5-H) MOMENTUM COMPUTE (trend + streak + decay)
-- =========================================================
-- Momentum is computed from:
-- 1) XP today vs avg XP last 7 days (trend)
-- 2) Streak strength (current streak normalized)
-- 3) Decay penalty if missing activity
create or replace function public.compute_daily_momentum(
  p_owner_user_id text,
  p_day date
)
returns numeric
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  d date := coalesce(p_day, now()::date);
  xp_today numeric := 0;
  xp_avg7 numeric := 0;
  trend numeric := 0;
  streak_component numeric := 0;
  decay_penalty numeric := 0;
  raw numeric := 0;
  scaled numeric := 0;
begin
  -- ensure XP exists
  select public.compute_daily_xp(p_owner_user_id, d) into xp_today;

  select coalesce(avg(xp),0)
    into xp_avg7
  from public.user_daily_xp
  where owner_user_id = p_owner_user_id
    and day between (d - 7) and (d - 1);

  -- trend: -1..+1, damped
  trend := case
    when xp_avg7 <= 0 then 0
    else greatest(least((xp_today - xp_avg7) / (xp_avg7 + 10), 1), -1)
  end;

  -- streak component: take best streak among configured rollups (or 0)
  select coalesce(max(least(current_streak::numeric / 14, 1)), 0)
    into streak_component
  from public.user_streaks
  where owner_user_id = p_owner_user_id;

  -- decay penalty: if XP is zero today, apply penalty based on how many consecutive zero-xp days
  select coalesce(count(*),0)
    into decay_penalty
  from public.user_daily_xp
  where owner_user_id = p_owner_user_id
    and day <= d
    and xp = 0
    and day >= d - 7;

  -- raw score combines: base xp + trend + streak - decay
  raw := (xp_today / 50) + (trend * 0.5) + (streak_component * 0.5) - (least(decay_penalty, 7) / 14);

  -- scale 0..100
  scaled := greatest(least((raw * 50) + 50, 100), 0);

  insert into public.user_daily_momentum (owner_user_id, day, momentum, raw_score)
  values (p_owner_user_id, d, scaled, raw)
  on conflict (owner_user_id, day)
  do update set momentum = excluded.momentum, raw_score = excluded.raw_score, computed_at = now();

  return scaled;
end;
$$;

revoke all on function public.compute_daily_momentum(text, date) from public;

-- =========================================================
-- G5-I) LIFE SCORE (rollup-driven, decayed, weighted)
-- =========================================================
-- Life Score = weighted sum of decayed rollup values, normalized to 0..100.
-- weights live in rollup_xp_weights.xp_per_unit (re-used as "importance weight") to keep system simple.
create or replace function public.compute_daily_life_score(
  p_owner_user_id text,
  p_day date
)
returns numeric
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  d date := coalesce(p_day, now()::date);
  total_weight numeric := 0;
  weighted_sum numeric := 0;
  score numeric := 0;
begin
  with base as (
    select
      rv.rollup_key,
      rv.value::numeric as value,
      w.xp_per_unit as weight
    from public.rollup_values rv
    join public.rollup_xp_weights w
      on w.rollup_key = rv.rollup_key
     and w.is_active = true
    where rv.owner_user_id = p_owner_user_id
      and rv.window_start = d
      and w.xp_per_unit > 0
  ),
  decayed as (
    select
      rollup_key,
      public.apply_decay(rollup_key, value, 0) as v_decayed, -- daily rollup already "today"; decay applied elsewhere if you want rolling windows
      weight
    from base
  )
  select
    coalesce(sum(weight),0),
    coalesce(sum(v_decayed * weight),0)
  into total_weight, weighted_sum
  from decayed;

  -- normalize: assume "ideal" is v_decayed ~= 1 per rollup; clamp
  if total_weight <= 0 then
    score := 0;
  else
    score := greatest(least((weighted_sum / total_weight) * 100, 100), 0);
  end if;

  insert into public.user_daily_life_score (owner_user_id, day, life_score)
  values (p_owner_user_id, d, score)
  on conflict (owner_user_id, day)
  do update set life_score = excluded.life_score, computed_at = now();

  return score;
end;
$$;

revoke all on function public.compute_daily_life_score(text, date) from public;

-- =========================================================
-- G5-J) STREAK RISK (Predictive streak loss)
-- =========================================================
-- Risk heuristic:
-- - If last_active_date is yesterday => low risk
-- - If last_active_date is 2+ days ago => rising risk
-- - If momentum is low and xp is low => higher risk
create or replace function public.compute_streak_risk(
  p_owner_user_id text,
  p_rollup_key text,
  p_day date
)
returns table (risk numeric, reason text)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  d date := coalesce(p_day, now()::date);
  s public.user_streaks;
  days_since int := 999;
  mom numeric := 50;
  xp numeric := 0;
  r numeric := 0;
  why text := '';
begin
  select * into s
  from public.user_streaks
  where owner_user_id = p_owner_user_id
    and rollup_key = p_rollup_key;

  if not found or s.last_active_date is null then
    return query select 0.2::numeric, 'No streak baseline yet';
    return;
  end if;

  days_since := (d - s.last_active_date);

  select coalesce(momentum,50) into mom
  from public.user_daily_momentum
  where owner_user_id = p_owner_user_id and day = d;

  select coalesce(xp,0) into xp
  from public.user_daily_xp
  where owner_user_id = p_owner_user_id and day = d;

  -- base risk by inactivity
  if days_since <= 0 then
    r := 0.10;
    why := 'Active today';
  elsif days_since = 1 then
    r := 0.30;
    why := 'Last active yesterday';
  elsif days_since = 2 then
    r := 0.60;
    why := 'Missed 1 full day';
  else
    r := 0.80;
    why := 'Missed 2+ days';
  end if;

  -- amplify if low momentum and low xp
  if mom < 35 then
    r := r + 0.10;
    why := why || '; low momentum';
  end if;

  if xp = 0 then
    r := r + 0.10;
    why := why || '; zero XP today';
  end if;

  r := greatest(least(r, 1), 0);

  return query select r, why;
end;
$$;

revoke all on function public.compute_streak_risk(text, text, date) from public;

-- =========================================================
-- G5-K) NUDGE CANDIDATES (server-side generation)
-- =========================================================
-- Emits nudges into user_nudges with cooldown suppression.
create or replace function public.generate_daily_nudges(
  p_owner_user_id text,
  p_day date
)
returns int
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  d date := coalesce(p_day, now()::date);
  inserted int := 0;
  mom numeric := 50;
  ls numeric := 0;
  xp numeric := 0;
begin
  select coalesce(momentum,50) into mom
  from public.user_daily_momentum
  where owner_user_id = p_owner_user_id and day = d;

  select coalesce(life_score,0) into ls
  from public.user_daily_life_score
  where owner_user_id = p_owner_user_id and day = d;

  select coalesce(xp,0) into xp
  from public.user_daily_xp
  where owner_user_id = p_owner_user_id and day = d;

  -- NUDGE: low momentum
  if mom < 35 then
    inserted := inserted + public._insert_nudge_if_not_in_cooldown(p_owner_user_id, d, 'momentum_low');
  end if;

  -- NUDGE: life score slipping
  if ls < 40 then
    inserted := inserted + public._insert_nudge_if_not_in_cooldown(p_owner_user_id, d, 'life_score_low');
  end if;

  -- NUDGE: no xp today
  if xp = 0 then
    inserted := inserted + public._insert_nudge_if_not_in_cooldown(p_owner_user_id, d, 'xp_zero');
  end if;

  return inserted;
end;
$$;

-- helper: cooldown insert (internal)
create or replace function public._insert_nudge_if_not_in_cooldown(
  p_owner_user_id text,
  p_day date,
  p_nudge_key text
)
returns int
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  t public.nudge_templates;
  last_created timestamptz;
begin
  select * into t
  from public.nudge_templates
  where nudge_key = p_nudge_key
    and is_active = true;

  if not found then
    return 0;
  end if;

  select max(created_at) into last_created
  from public.user_nudges
  where owner_user_id = p_owner_user_id
    and nudge_key = p_nudge_key;

  if last_created is not null and last_created > now() - make_interval(hours => t.cooldown_hours) then
    return 0;
  end if;

  insert into public.user_nudges (owner_user_id, nudge_key, day, title, body, severity)
  values (p_owner_user_id, p_nudge_key, p_day, t.title, t.body, t.severity);

  return 1;
end;
$$;

revoke all on function public.generate_daily_nudges(text, date) from public;
revoke all on function public._insert_nudge_if_not_in_cooldown(text, date, text) from public;

-- Nudge templates (Seed)
insert into public.nudge_templates (nudge_key, title, body, severity, cooldown_hours)
values
  ('momentum_low', 'Momentum is dipping', 'Do one small win right now: 10 minutes on a key task or a short walk to reset the system.', 'med', 24),
  ('life_score_low', 'Life Score is low today', 'Pick one pillar to lift: health, relationships, or mission. A single action can move the needle.', 'high', 24),
  ('xp_zero', 'No XP yet today', 'Earn your first points: log a quick action, complete a micro-quest, or capture one canon event.', 'low', 12)
on conflict (nudge_key) do update
set title = excluded.title,
    body = excluded.body,
    severity = excluded.severity,
    cooldown_hours = excluded.cooldown_hours,
    is_active = true;

-- Example weight configs (tune later)
insert into public.rollup_xp_weights (rollup_key, xp_per_unit, daily_cap_xp, min_value_for_xp, is_active)
values
  ('activity_events_daily_count', 5, 50, 1, true)
on conflict (rollup_key) do update
set xp_per_unit = excluded.xp_per_unit,
    daily_cap_xp = excluded.daily_cap_xp,
    min_value_for_xp = excluded.min_value_for_xp,
    is_active = true,
    updated_at = now();

-- Example decay rule (optional)
insert into public.rollup_decay_rules (rollup_key, model, half_life_days, linear_per_day, floor)
values
  ('activity_events_daily_count', 'half_life', 3, null, 0)
on conflict (rollup_key) do update
set model = excluded.model,
    half_life_days = excluded.half_life_days,
    linear_per_day = excluded.linear_per_day,
    floor = excluded.floor,
    updated_at = now();

-- Example streak alert rule
insert into public.streak_alert_rules (rollup_key, risk_threshold, notify_cooldown_hours, is_active)
values
  ('activity_events_daily_count', 0.65, 24, true)
on conflict (rollup_key) do update
set risk_threshold = excluded.risk_threshold,
    notify_cooldown_hours = excluded.notify_cooldown_hours,
    is_active = true,
    updated_at = now();

commit;
