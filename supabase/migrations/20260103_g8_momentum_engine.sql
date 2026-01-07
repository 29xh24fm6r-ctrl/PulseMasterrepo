begin;

-- =====================================================================================
-- G8: MEMORY MOMENTUM ENGINE (Behavioral Physics)
-- =====================================================================================

-- 1) Momentum Ledger (Immutable Signal Log)
create table if not exists public.momentum_events (
  id uuid primary key default gen_random_uuid(),
  owner_user_id text not null,
  domain_slug text not null, -- 'crm','personal','learning','finance','health'
  signal_type text not null, -- 'interaction','consistency', etc.
  weight int not null default 1,
  source_event_id uuid not null, -- FK to activity_events or source table
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Index for fast aggregation and history queries
create index if not exists momentum_events_owner_domain_idx
  on public.momentum_events (owner_user_id, domain_slug, occurred_at desc);

-- 2) Momentum Snapshots (Daily Cache)
create table if not exists public.momentum_snapshots (
  owner_user_id text not null,
  domain_slug text not null,
  score int not null default 0,
  streak_current int not null default 0,
  streak_longest int not null default 0,
  last_activity_at timestamptz null,
  trend text not null default 'flat' check (trend in ('up','down','flat')),
  decay_applied_at timestamptz null,
  updated_at timestamptz not null default now(),
  primary key (owner_user_id, domain_slug)
);

-- RLS
alter table public.momentum_events enable row level security;
alter table public.momentum_snapshots enable row level security;

-- Service role only
revoke all on table public.momentum_events from public;
revoke all on table public.momentum_snapshots from public;

-- =====================================================================================
-- 3) Ingest RPC (Atomic Insert + Update)
-- =====================================================================================
create or replace function public.momentum_event_ingest(
  p_owner_user_id text,
  p_domain_slug text,
  p_signal_type text,
  p_weight int,
  p_source_event_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_activity_at timestamptz := now();
  v_snap public.momentum_snapshots;
  v_days_diff int;
  v_new_streak int;
begin
  -- 1. Insert Ledger Entry
  insert into public.momentum_events (
    owner_user_id, domain_slug, signal_type, weight, source_event_id, occurred_at
  )
  values (
    p_owner_user_id, p_domain_slug, p_signal_type, p_weight, p_source_event_id, v_new_activity_at
  );

  -- 2. Fetch current snapshot (lock row)
  select * into v_snap
  from public.momentum_snapshots
  where owner_user_id = p_owner_user_id and domain_slug = p_domain_slug
  for update;

  if not found then
    -- Initialize if missing
    insert into public.momentum_snapshots (owner_user_id, domain_slug, score, streak_current, streak_longest, last_activity_at)
    values (p_owner_user_id, p_domain_slug, p_weight, 1, 1, v_new_activity_at);
    return;
  end if;

  -- 3. Streak Config Logic
  --    If last activity was yesterday (or today), streak continues.
  --    If older, streak resets.
  --    Note: Precise day diff depends on timezone. Using approximate 24h windows for v1 simplicity.
  --    Ideal: Use user's local day from context, but here we likely rely on server UTC.
  if v_snap.last_activity_at is null then
    v_days_diff := 0;
  else
    v_days_diff := extract(day from (v_new_activity_at - v_snap.last_activity_at))::int;
  end if;

  if v_days_diff <= 1 then
    -- Continued streak (same day or next day)
    -- Only increment streak if day changed? For momentum, "events" add score, maybe not streak?
    -- Logic: Streak is usually "daily active".
    -- If it's a NEW day (>= 1 day gap via date truncate?), increment.
    -- Simplified: If date(now) > date(last), streak++.
    if v_snap.last_activity_at::date < v_new_activity_at::date then
        v_new_streak := v_snap.streak_current + 1;
    else
        v_new_streak := v_snap.streak_current;
    end if;
  else
    -- Streak broken
    v_new_streak := 1;
  end if;

  -- 4. Update Snapshot
  update public.momentum_snapshots
  set
    score = score + p_weight, -- Simple accretion for now (decay handled by cron)
    streak_current = v_new_streak,
    streak_longest = greatest(streak_longest, v_new_streak),
    last_activity_at = v_new_activity_at,
    trend = 'up', -- Activity always bumps up
    updated_at = now()
  where owner_user_id = p_owner_user_id and domain_slug = p_domain_slug;

end;
$$;

revoke all on function public.momentum_event_ingest(text, text, text, int, uuid) from public;

-- =====================================================================================
-- 4) Read RPC (UI)
-- =====================================================================================
create or replace function public.momentum_history_read(
  p_owner_user_id text,
  p_domain_slug text default null,
  p_days int default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int := public._clamp_int(p_days, 1, 365);
  v_snapshots jsonb;
  v_history jsonb;
begin
  -- Get snapshots
  select coalesce(jsonb_agg(s), '[]'::jsonb)
    into v_snapshots
  from public.momentum_snapshots s
  where s.owner_user_id = p_owner_user_id
    and (p_domain_slug is null or s.domain_slug = p_domain_slug);

  -- Get history graph (daily aggregates)
  select coalesce(jsonb_agg(x), '[]'::jsonb)
    into v_history
  from (
    select
      date_trunc('day', occurred_at) as day,
      domain_slug,
      sum(weight) as total_weight,
      count(*) as event_count
    from public.momentum_events
    where owner_user_id = p_owner_user_id
      and (p_domain_slug is null or domain_slug = p_domain_slug)
      and occurred_at >= now() - (v_limit || ' days')::interval
    group by 1, 2
    order by 1 asc
  ) x;

  return jsonb_build_object(
    'snapshots', v_snapshots,
    'history', v_history
  );
end;
$$;

revoke all on function public.momentum_history_read(text, text, int) from public;

-- =====================================================================================
-- 5) Snapshot Refresh / Decay (Scheduled Job)
--    To be called nightly. Applies decay to scores.
-- =====================================================================================
create or replace function public.momentum_snapshot_refresh(
  p_owner_user_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_decay_rate float := 0.95; -- 5% decay per day
  v_new_score int;
  v_days_gap int;
begin
  for r in select * from public.momentum_snapshots where owner_user_id = p_owner_user_id
  loop
    -- Apply decay
    v_new_score := floor(r.score * v_decay_rate)::int;

    -- Streak maintanence
    if r.last_activity_at < (now() - interval '2 days') then
        -- Missed yesterday? Streak broken.
        update public.momentum_snapshots
        set streak_current = 0,
            score = v_new_score,
            trend = case when v_new_score < r.score then 'down' else 'flat' end,
            decay_applied_at = now(),
            updated_at = now()
        where owner_user_id = p_owner_user_id and domain_slug = r.domain_slug;
    else
        -- Just update score/trend
        update public.momentum_snapshots
        set score = v_new_score,
            trend = case when v_new_score < r.score then 'down' else 'flat' end,
            decay_applied_at = now(),
            updated_at = now()
        where owner_user_id = p_owner_user_id and domain_slug = r.domain_slug;
    end if;
  end loop;
end;
$$;

revoke all on function public.momentum_snapshot_refresh(text) from public;

commit;
