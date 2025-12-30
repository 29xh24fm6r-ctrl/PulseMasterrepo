begin;

create extension if not exists pgcrypto;

-- ============================================================
-- A) QUESTS (definitions) — quests are not "progress state"
-- ============================================================
create table if not exists public.quests (
  id uuid primary key default gen_random_uuid(),
  key text not null unique, -- "morning_routine", "deep_work_daily", etc.
  name text not null,
  description text null,
  is_active boolean not null default true,
  quest_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.quests enable row level security;

drop policy if exists "quests_select_all" on public.quests;
create policy "quests_select_all"
on public.quests for select
using (true);

-- (writes intentionally not granted; admin only)

-- ============================================================
-- B) QUEST EVALUATORS (versioned) — define "completion rules"
-- ============================================================
create table if not exists public.quest_evaluators (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references public.quests(id) on delete cascade,
  evaluator_key text not null,    -- aligns with xp_evaluators.key (or a quest-specific evaluator)
  evaluator_version int not null, -- version for deterministic rules
  rule jsonb not null default '{}'::jsonb,
  -- example rule JSON:
  -- {
  --   "window": "day" | "week" | "month" | "custom",
  --   "requirements": [
  --      {"type":"evidence", "evidence_type":"workout.completed", "min_count":1},
  --      {"type":"xp", "xp_type":"xp_discipline", "min_total":20}
  --   ],
  --   "success": {"xp_bonus": {"xp_identity":5}}
  -- }
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (quest_id, evaluator_key, evaluator_version)
);

create index if not exists idx_quest_eval_active on public.quest_evaluators (quest_id, is_active);

alter table public.quest_evaluators enable row level security;

drop policy if exists "quest_evaluators_select_all" on public.quest_evaluators;
create policy "quest_evaluators_select_all"
on public.quest_evaluators for select
using (true);

-- ============================================================
-- C) QUEST CHECKPOINTS (derived snapshots) — optional cache
-- not source of truth; safe to delete/rebuild any time
-- ============================================================
create table if not exists public.quest_checkpoints (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  quest_id uuid not null references public.quests(id) on delete cascade,
  evaluator_key text not null,
  evaluator_version int not null,
  window_start timestamptz not null,
  window_end timestamptz not null,
  status text not null, -- "complete" | "incomplete"
  details jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now(),
  unique (user_id, quest_id, evaluator_key, evaluator_version, window_start, window_end)
);

create index if not exists idx_quest_checkpoints_user_time on public.quest_checkpoints (user_id, computed_at desc);

alter table public.quest_checkpoints enable row level security;

drop policy if exists "quest_checkpoints_select_own" on public.quest_checkpoints;
create policy "quest_checkpoints_select_own"
on public.quest_checkpoints for select
using (user_id = auth.uid());

drop policy if exists "quest_checkpoints_insert_own" on public.quest_checkpoints;
create policy "quest_checkpoints_insert_own"
on public.quest_checkpoints for insert
with check (user_id = auth.uid());

-- append-only cache; updates/deletes discouraged (rebuild instead)
drop policy if exists "quest_checkpoints_no_update" on public.quest_checkpoints;
create policy "quest_checkpoints_no_update"
on public.quest_checkpoints for update
using (false);

drop policy if exists "quest_checkpoints_no_delete" on public.quest_checkpoints;
create policy "quest_checkpoints_no_delete"
on public.quest_checkpoints for delete
using (false);

-- ============================================================
-- D) REPLAY JOBS — queue of evidence to re-evaluate
-- ============================================================
create table if not exists public.xp_replay_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  evidence_id uuid not null references public.life_evidence(id) on delete restrict,
  evaluator_key text not null,
  from_version int not null,
  to_version int not null,
  status text not null default 'queued', -- queued | running | done | failed
  error text null,
  created_at timestamptz not null default now(),
  started_at timestamptz null,
  finished_at timestamptz null,
  unique (user_id, evidence_id, evaluator_key, from_version, to_version)
);

create index if not exists idx_xp_replay_jobs_status on public.xp_replay_jobs (status, created_at asc);

alter table public.xp_replay_jobs enable row level security;

drop policy if exists "xp_replay_jobs_select_own" on public.xp_replay_jobs;
create policy "xp_replay_jobs_select_own"
on public.xp_replay_jobs for select
using (user_id = auth.uid());

drop policy if exists "xp_replay_jobs_insert_own" on public.xp_replay_jobs;
create policy "xp_replay_jobs_insert_own"
on public.xp_replay_jobs for insert
with check (user_id = auth.uid());

-- allow updates to status for owner (job runner can be user-scoped)
drop policy if exists "xp_replay_jobs_update_own" on public.xp_replay_jobs;
create policy "xp_replay_jobs_update_own"
on public.xp_replay_jobs for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- ============================================================
-- E) BELTS — definitions + derived status snapshot
-- ============================================================
create table if not exists public.belt_tracks (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,  -- "discipline", "physical", etc
  name text not null,
  description text null,
  xp_type text not null,     -- should match xp_kind enum value string
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.belt_tracks enable row level security;

drop policy if exists "belt_tracks_select_all" on public.belt_tracks;
create policy "belt_tracks_select_all"
on public.belt_tracks for select
using (true);

create table if not exists public.belt_levels (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.belt_tracks(id) on delete cascade,
  level int not null, -- 1..N
  name text not null, -- "White", "Yellow", ...
  min_total int not null, -- threshold of derived XP total
  created_at timestamptz not null default now(),
  unique (track_id, level),
  unique (track_id, min_total)
);

alter table public.belt_levels enable row level security;

drop policy if exists "belt_levels_select_all" on public.belt_levels;
create policy "belt_levels_select_all"
on public.belt_levels for select
using (true);

-- Optional cache snapshot; derived from v_xp_totals + belt_levels
create table if not exists public.user_belt_status (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  track_id uuid not null references public.belt_tracks(id) on delete cascade,
  level int not null,
  computed_at timestamptz not null default now(),
  unique (user_id, track_id)
);

alter table public.user_belt_status enable row level security;

drop policy if exists "user_belt_status_select_own" on public.user_belt_status;
create policy "user_belt_status_select_own"
on public.user_belt_status for select
using (user_id = auth.uid());

drop policy if exists "user_belt_status_upsert_own" on public.user_belt_status;
create policy "user_belt_status_upsert_own"
on public.user_belt_status for insert
with check (user_id = auth.uid());

drop policy if exists "user_belt_status_update_own" on public.user_belt_status;
create policy "user_belt_status_update_own"
on public.user_belt_status for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- ============================================================
-- F) VIEWS — derived belt status (source of truth)
-- ============================================================
-- requires v_xp_totals from previous migration
create or replace view public.v_user_belts as
with totals as (
  select user_id, xp_type::text as xp_type, total
  from public.v_xp_totals
),
joined as (
  select
    t.user_id,
    bt.id as track_id,
    bt.key as track_key,
    bt.name as track_name,
    bt.xp_type,
    coalesce(tt.total, 0) as xp_total,
    bl.level,
    bl.name as level_name,
    bl.min_total
  from public.belt_tracks bt
  left join totals tt
    on tt.xp_type = bt.xp_type
  join lateral (
    select bl2.*
    from public.belt_levels bl2
    where bl2.track_id = bt.id
      and bl2.min_total <= coalesce(tt.total, 0)
    order by bl2.min_total desc
    limit 1
  ) bl on true
  join lateral (
    select distinct user_id from totals
  ) t on true
)
select * from joined;

-- ============================================================
-- G) RPC — compute quest window bounds (day/week/month)
-- ============================================================
create or replace function public.rpc_quest_window(
  p_window text,              -- 'day'|'week'|'month'
  p_at timestamptz default now()
) returns table(window_start timestamptz, window_end timestamptz)
language plpgsql
security invoker
as $$
begin
  if p_window = 'day' then
    window_start := date_trunc('day', p_at);
    window_end := window_start + interval '1 day';
  elsif p_window = 'week' then
    window_start := date_trunc('week', p_at);
    window_end := window_start + interval '1 week';
  elsif p_window = 'month' then
    window_start := date_trunc('month', p_at);
    window_end := window_start + interval '1 month';
  else
    raise exception 'unsupported window %', p_window;
  end if;

  return next;
end;
$$;

-- ============================================================
-- H) RPC — build quest checkpoint (derived) for (quest, user, window)
-- Uses evaluator rule JSON:
--  requirements[]:
--   - {type:"evidence", evidence_type, min_count}
--   - {type:"xp", xp_type, min_total}
-- ============================================================
create or replace function public.rpc_compute_quest_checkpoint(
  p_quest_key text,
  p_at timestamptz default now()
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_user uuid := auth.uid();
  v_quest record;
  v_eval record;
  v_window text;
  v_ws timestamptz;
  v_we timestamptz;
  v_req jsonb;
  v_complete boolean := true;
  v_details jsonb := '{}'::jsonb;
  v_checkpoint_id uuid;
  v_need_count int;
  v_have_count int;
  v_need_total int;
  v_have_total int;
  v_xp_type text;
  v_evidence_type text;
begin
  select * into v_quest from public.quests where key = p_quest_key and is_active = true;
  if not found then
    raise exception 'quest not found or inactive';
  end if;

  select * into v_eval
  from public.quest_evaluators
  where quest_id = v_quest.id and is_active = true
  order by evaluator_version desc
  limit 1;

  if not found then
    raise exception 'quest evaluator not found';
  end if;

  v_window := coalesce(v_eval.rule->>'window', 'day');

  select window_start, window_end
    into v_ws, v_we
  from public.rpc_quest_window(v_window, p_at);

  -- evaluate requirements
  for v_req in
    select value from jsonb_array_elements(coalesce(v_eval.rule->'requirements','[]'::jsonb))
  loop
    if v_req->>'type' = 'evidence' then
      v_evidence_type := v_req->>'evidence_type';
      v_need_count := coalesce((v_req->>'min_count')::int, 1);

      select count(*) into v_have_count
      from public.life_evidence
      where user_id = v_user
        and evidence_type = v_evidence_type
        and created_at >= v_ws and created_at < v_we;

      v_details := v_details || jsonb_build_object(
        v_evidence_type,
        jsonb_build_object('need', v_need_count, 'have', v_have_count)
      );

      if v_have_count < v_need_count then
        v_complete := false;
      end if;

    elsif v_req->>'type' = 'xp' then
      v_xp_type := v_req->>'xp_type';
      v_need_total := coalesce((v_req->>'min_total')::int, 1);

      select coalesce(sum(amount),0)::int into v_have_total
      from public.xp_ledger
      where user_id = v_user
        and xp_type::text = v_xp_type
        and created_at >= v_ws and created_at < v_we;

      v_details := v_details || jsonb_build_object(
        v_xp_type,
        jsonb_build_object('need', v_need_total, 'have', v_have_total)
      );

      if v_have_total < v_need_total then
        v_complete := false;
      end if;
    end if;
  end loop;

  insert into public.quest_checkpoints(
    user_id, quest_id, evaluator_key, evaluator_version,
    window_start, window_end, status, details
  )
  values (
    v_user, v_quest.id, v_eval.evaluator_key, v_eval.evaluator_version,
    v_ws, v_we,
    case when v_complete then 'complete' else 'incomplete' end,
    v_details
  )
  on conflict (user_id, quest_id, evaluator_key, evaluator_version, window_start, window_end)
  do update set id = public.quest_checkpoints.id
  returning id into v_checkpoint_id;

  return v_checkpoint_id;
end;
$$;

commit;
