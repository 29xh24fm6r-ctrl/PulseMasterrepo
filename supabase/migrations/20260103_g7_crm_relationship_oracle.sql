begin;

-- =====================================================================================
-- G7: CRM Relationship Oracle (service-role tables + SECURITY DEFINER RPCs)
-- =====================================================================================

-- ---------- 0) Safety helpers ----------
create or replace function public._clamp_int(p int, lo int, hi int)
returns int language sql immutable as $$
  select greatest(lo, least(coalesce(p, lo), hi));
$$;

-- ---------- 1) Core tables ----------
-- Interactions = atomic events (call/email/meeting/text/note)
create table if not exists public.crm_interactions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id text not null,
  contact_id uuid not null,
  kind text not null check (kind in ('call','email','meeting','text','note','other')),
  channel text null,
  occurred_at timestamptz not null default now(),
  subject text null,
  body text null,
  duration_seconds int null,
  sentiment smallint null check (sentiment is null or (sentiment between -5 and 5)),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Followups = actionable system (due/snooze/done)
create table if not exists public.crm_followups (
  id uuid primary key default gen_random_uuid(),
  owner_user_id text not null,
  contact_id uuid not null,
  status text not null default 'open' check (status in ('open','done','snoozed','canceled')),
  due_at timestamptz not null,
  reason text null,
  suggested_action text null,
  source text not null default 'manual' check (source in ('manual','system','ai')),
  snoozed_until timestamptz null,
  completed_at timestamptz null,
  created_at timestamptz not null default now()
);

-- Influence events = high-signal events that change relationship trajectory
create table if not exists public.crm_influence_events (
  id uuid primary key default gen_random_uuid(),
  owner_user_id text not null,
  contact_id uuid not null,
  occurred_at timestamptz not null default now(),
  type text not null check (type in ('referral','intro','deal_win','deal_loss','gift','helped_me','i_helped_them','other')),
  impact_score smallint not null default 0 check (impact_score between -10 and 10),
  notes text null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Relationship scores = cached truth for fast UI
create table if not exists public.crm_relationship_scores (
  owner_user_id text not null,
  contact_id uuid not null,
  score int not null default 0,
  risk_level text not null default 'ok' check (risk_level in ('ok','watch','at_risk')),
  last_interaction_at timestamptz null,
  open_followups int not null default 0,
  days_since_last_interaction int null,
  notes text null,
  updated_at timestamptz not null default now(),
  primary key (owner_user_id, contact_id)
);

-- ---------- 2) Optional FK attachment (bulletproof if crm_contacts differs) ----------
do $$
begin
  if to_regclass('public.crm_contacts') is not null then
    begin
      alter table public.crm_interactions
        add constraint crm_interactions_contact_fk
        foreign key (contact_id) references public.crm_contacts(id)
        on delete cascade;
    exception when duplicate_object then null;
    end;

    begin
      alter table public.crm_followups
        add constraint crm_followups_contact_fk
        foreign key (contact_id) references public.crm_contacts(id)
        on delete cascade;
    exception when duplicate_object then null;
    end;

    begin
      alter table public.crm_influence_events
        add constraint crm_influence_events_contact_fk
        foreign key (contact_id) references public.crm_contacts(id)
        on delete cascade;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

-- ---------- 3) Performance indexes ----------
create index if not exists crm_interactions_owner_time_idx
  on public.crm_interactions (owner_user_id, occurred_at desc);

create index if not exists crm_interactions_owner_contact_time_idx
  on public.crm_interactions (owner_user_id, contact_id, occurred_at desc);

create index if not exists crm_followups_owner_status_due_idx
  on public.crm_followups (owner_user_id, status, due_at);

create index if not exists crm_influence_owner_contact_time_idx
  on public.crm_influence_events (owner_user_id, contact_id, occurred_at desc);

-- ---------- 4) Lockdown (service-role only) ----------
alter table public.crm_interactions enable row level security;
alter table public.crm_followups enable row level security;
alter table public.crm_influence_events enable row level security;
alter table public.crm_relationship_scores enable row level security;

revoke all on table public.crm_interactions from public;
revoke all on table public.crm_followups from public;
revoke all on table public.crm_influence_events from public;
revoke all on table public.crm_relationship_scores from public;

-- No policies: service_role bypass only.

-- =====================================================================================
-- 5) Scoring model (deterministic v1)
-- =====================================================================================
-- Score ingredients:
-- - Recency: exponential-ish via tier buckets
-- - Frequency: interactions last 30d
-- - Open followups: penalty
-- - Influence: last 90d net impact
--
-- Risk levels:
-- - at_risk: score <= 25 OR days_since_last_interaction >= 21
-- - watch:   score <= 45 OR days_since_last_interaction >= 14
-- - ok:      otherwise

create or replace function public.crm_relationship_score_recompute(
  p_owner_user_id text,
  p_contact_id uuid
)
returns public.crm_relationship_scores
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last timestamptz;
  v_days int;
  v_cnt30 int;
  v_open int;
  v_influence90 int;
  v_score int;
  v_risk text;
  v_row public.crm_relationship_scores;
begin
  -- last interaction
  select max(i.occurred_at)
    into v_last
  from public.crm_interactions i
  where i.owner_user_id = p_owner_user_id
    and i.contact_id = p_contact_id;

  if v_last is null then
    v_days := null;
  else
    v_days := greatest(0, (now()::date - v_last::date));
  end if;

  -- frequency last 30d
  select count(*)::int
    into v_cnt30
  from public.crm_interactions i
  where i.owner_user_id = p_owner_user_id
    and i.contact_id = p_contact_id
    and i.occurred_at >= now() - interval '30 days';

  -- open followups
  select count(*)::int
    into v_open
  from public.crm_followups f
  where f.owner_user_id = p_owner_user_id
    and f.contact_id = p_contact_id
    and f.status = 'open'
    and f.due_at <= now();

  -- influence last 90d (net)
  select coalesce(sum(e.impact_score), 0)::int
    into v_influence90
  from public.crm_influence_events e
  where e.owner_user_id = p_owner_user_id
    and e.contact_id = p_contact_id
    and e.occurred_at >= now() - interval '90 days';

  -- Recency score bucket
  -- (null => 0)
  v_score :=
    coalesce(
      case
        when v_days is null then 0
        when v_days <= 2  then 55
        when v_days <= 7  then 45
        when v_days <= 14 then 30
        when v_days <= 21 then 20
        else 10
      end, 0
    )
    + least(v_cnt30 * 5, 25)     -- frequency cap
    + greatest(least(v_influence90 * 2, 20), -20) -- influence cap
    - least(v_open * 10, 30);    -- overdue followup penalty cap

  v_score := greatest(0, least(v_score, 100));

  v_risk :=
    case
      when v_days is null then 'at_risk'
      when v_score <= 25 or v_days >= 21 then 'at_risk'
      when v_score <= 45 or v_days >= 14 then 'watch'
      else 'ok'
    end;

  insert into public.crm_relationship_scores as s (
    owner_user_id, contact_id, score, risk_level,
    last_interaction_at, open_followups, days_since_last_interaction,
    updated_at
  )
  values (
    p_owner_user_id, p_contact_id, v_score, v_risk,
    v_last, coalesce(v_open,0), v_days,
    now()
  )
  on conflict (owner_user_id, contact_id) do update
    set score = excluded.score,
        risk_level = excluded.risk_level,
        last_interaction_at = excluded.last_interaction_at,
        open_followups = excluded.open_followups,
        days_since_last_interaction = excluded.days_since_last_interaction,
        updated_at = now()
  returning s.* into v_row;

  return v_row;
end;
$$;

revoke all on function public.crm_relationship_score_recompute(text, uuid) from public;

-- =====================================================================================
-- 6) Write RPCs (interaction + followup + influence) with “recompute on write”
-- =====================================================================================

create or replace function public.crm_interaction_add(
  p_owner_user_id text,
  p_contact_id uuid,
  p_kind text,
  p_occurred_at timestamptz default now(),
  p_subject text default null,
  p_body text default null,
  p_channel text default null,
  p_duration_seconds int default null,
  p_sentiment smallint default null,
  p_meta jsonb default '{}'::jsonb
)
returns table (
  interaction_id uuid,
  score int,
  risk_level text,
  last_interaction_at timestamptz,
  open_followups int,
  days_since_last_interaction int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_score_row public.crm_relationship_scores;
begin
  insert into public.crm_interactions (
    owner_user_id, contact_id, kind, occurred_at,
    subject, body, channel, duration_seconds, sentiment, meta
  )
  values (
    p_owner_user_id, p_contact_id, p_kind, coalesce(p_occurred_at, now()),
    p_subject, p_body, p_channel, p_duration_seconds, p_sentiment, coalesce(p_meta,'{}'::jsonb)
  )
  returning id into v_id;

  v_score_row := public.crm_relationship_score_recompute(p_owner_user_id, p_contact_id);

  return query
  select
    v_id,
    v_score_row.score,
    v_score_row.risk_level,
    v_score_row.last_interaction_at,
    v_score_row.open_followups,
    v_score_row.days_since_last_interaction;
end;
$$;

revoke all on function public.crm_interaction_add(text, uuid, text, timestamptz, text, text, text, int, smallint, jsonb) from public;

create or replace function public.crm_followup_create(
  p_owner_user_id text,
  p_contact_id uuid,
  p_due_at timestamptz,
  p_reason text default null,
  p_suggested_action text default null,
  p_source text default 'manual'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.crm_followups (
    owner_user_id, contact_id, due_at, reason, suggested_action, source
  )
  values (
    p_owner_user_id, p_contact_id,
    coalesce(p_due_at, now() + interval '1 day'),
    p_reason, p_suggested_action, coalesce(p_source,'manual')
  )
  returning id into v_id;

  perform public.crm_relationship_score_recompute(p_owner_user_id, p_contact_id);
  return v_id;
end;
$$;

revoke all on function public.crm_followup_create(text, uuid, timestamptz, text, text, text) from public;

create or replace function public.crm_followup_mark_done(
  p_owner_user_id text,
  p_followup_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contact uuid;
begin
  select f.contact_id into v_contact
  from public.crm_followups f
  where f.id = p_followup_id and f.owner_user_id = p_owner_user_id;

  update public.crm_followups
     set status='done', completed_at=now()
   where id=p_followup_id and owner_user_id=p_owner_user_id;

  if v_contact is not null then
    perform public.crm_relationship_score_recompute(p_owner_user_id, v_contact);
  end if;
end;
$$;

revoke all on function public.crm_followup_mark_done(text, uuid) from public;

create or replace function public.crm_influence_event_add(
  p_owner_user_id text,
  p_contact_id uuid,
  p_type text,
  p_impact_score smallint default 0,
  p_occurred_at timestamptz default now(),
  p_notes text default null,
  p_meta jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.crm_influence_events (
    owner_user_id, contact_id, type, impact_score, occurred_at, notes, meta
  )
  values (
    p_owner_user_id, p_contact_id, p_type,
    coalesce(p_impact_score,0),
    coalesce(p_occurred_at, now()),
    p_notes, coalesce(p_meta,'{}'::jsonb)
  )
  returning id into v_id;

  perform public.crm_relationship_score_recompute(p_owner_user_id, p_contact_id);
  return v_id;
end;
$$;

revoke all on function public.crm_influence_event_add(text, uuid, text, smallint, timestamptz, text, jsonb) from public;

-- =====================================================================================
-- 7) Read RPCs (oracle bundle)
-- =====================================================================================

-- Due followups + at-risk contacts in ONE call for UI
create or replace function public.crm_oracle_bundle(
  p_owner_user_id text,
  p_limit int default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int := public._clamp_int(p_limit, 1, 100);
  v_due jsonb;
  v_risk jsonb;
begin
  select coalesce(jsonb_agg(x), '[]'::jsonb)
    into v_due
  from (
    select
      f.id,
      f.contact_id,
      f.due_at,
      f.reason,
      f.suggested_action,
      f.source,
      s.score,
      s.risk_level,
      s.days_since_last_interaction
    from public.crm_followups f
    left join public.crm_relationship_scores s
      on s.owner_user_id = f.owner_user_id and s.contact_id = f.contact_id
    where f.owner_user_id = p_owner_user_id
      and f.status = 'open'
      and f.due_at <= now()
    order by f.due_at asc
    limit v_limit
  ) x;

  select coalesce(jsonb_agg(y), '[]'::jsonb)
    into v_risk
  from (
    select
      s.contact_id,
      s.score,
      s.risk_level,
      s.last_interaction_at,
      s.open_followups,
      s.days_since_last_interaction,
      s.updated_at
    from public.crm_relationship_scores s
    where s.owner_user_id = p_owner_user_id
      and s.risk_level in ('watch','at_risk')
    order by
      case when s.risk_level='at_risk' then 0 else 1 end,
      s.score asc,
      s.days_since_last_interaction desc nulls last
    limit v_limit
  ) y;

  return jsonb_build_object(
    'due_followups', v_due,
    'at_risk_contacts', v_risk
  );
end;
$$;

revoke all on function public.crm_oracle_bundle(text, int) from public;

commit;
