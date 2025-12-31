begin;

create extension if not exists pg_cron;

-- 1) Scheduler targets: which users should receive recurring enqueues
create table if not exists public.scheduler_targets (
  user_id text primary key,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists tr_scheduler_targets_updated_at on public.scheduler_targets;
create trigger tr_scheduler_targets_updated_at
before update on public.scheduler_targets
for each row execute function public.tg_set_updated_at();

alter table public.scheduler_targets enable row level security;

-- No policies for public select/insert because only admin/server should manage this typically.
-- BUT to allow the user to enable themselves via API (RLS), we can add policies.
-- Let's stick to server-side admin management for now via API, using service_role in API.
-- Actually, the prompt implies "auto-register user ... from /today", which calls an API.
-- If the API uses supabaseAdmin, we don't strictly need RLS policies for the user.
-- However, enabling RLS without policies means NO access, which is safe failure mode.
-- I'll replicate the prompt's policies just in case we want client-side access later.

drop policy if exists "scheduler_targets_select_own" on public.scheduler_targets;
create policy "scheduler_targets_select_own"
on public.scheduler_targets for select
using (user_id = auth.uid());

drop policy if exists "scheduler_targets_upsert_own" on public.scheduler_targets;
create policy "scheduler_targets_upsert_own"
on public.scheduler_targets for insert
with check (user_id = auth.uid());

drop policy if exists "scheduler_targets_update_own" on public.scheduler_targets;
create policy "scheduler_targets_update_own"
on public.scheduler_targets for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- 2) Helper: floor a timestamptz to N-minute bucket (used for dedupe keys)
create or replace function public.fn_time_bucket_key(p_at timestamptz, p_minutes int)
returns text
language sql
immutable
as $$
  select to_char(
    date_trunc('minute', p_at) - make_interval(mins => (extract(minute from p_at)::int % greatest(1,p_minutes))),
    'YYYYMMDDHH24MI'
  );
$$;

-- 3) Scheduler tick: enqueue recurring jobs for enabled users (idempotent)
-- SECURITY DEFINER so cron can run it. No user context.
create or replace function public.rpc_scheduler_tick(p_now timestamptz default now())
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user record;
  v_bucket_1 text;
  v_bucket_5 text;
  v_bucket_15 text;
  v_inserted int := 0;
begin
  -- buckets for dedupe keys
  v_bucket_1 := public.fn_time_bucket_key(p_now, 1);
  v_bucket_5 := public.fn_time_bucket_key(p_now, 5);
  v_bucket_15 := public.fn_time_bucket_key(p_now, 15);

  for v_user in
    select user_id from public.scheduler_targets where is_enabled = true
  loop
    -- Every 5 min: inbox triage
    insert into public.executions(user_id, kind, payload, run_at, priority, dedupe_key, max_attempts, status)
    values (
      v_user.user_id,
      'inbox.triage',
      jsonb_build_object('mode','inbox','limit',10),
      p_now,
      8,
      'recurring.inbox.triage.' || v_bucket_5,
      5,
      'queued'
    )
    on conflict (user_id, dedupe_key) do nothing;

    if found then v_inserted := v_inserted + 1; end if;

    -- Every 5 min: email flush
    insert into public.executions(user_id, kind, payload, run_at, priority, dedupe_key, max_attempts, status)
    values (
      v_user.user_id,
      'email.flush',
      jsonb_build_object('limit',25),
      p_now,
      7,
      'recurring.email.flush.' || v_bucket_5,
      5,
      'queued'
    )
    on conflict (user_id, dedupe_key) do nothing;

    if found then v_inserted := v_inserted + 1; end if;

    -- Every 15 min: refresh quest checkpoints (+ quest.completed evidence + bonus XP via your handler)
    insert into public.executions(user_id, kind, payload, run_at, priority, dedupe_key, max_attempts, status)
    values (
      v_user.user_id,
      'quest.refresh_today',
      jsonb_build_object('questKeys', jsonb_build_array('daily_workout','deep_work','discipline_20'), 'emitCompletionEvidence', true),
      p_now,
      6,
      'recurring.quest.refresh_today.' || v_bucket_15,
      5,
      'queued'
    )
    on conflict (user_id, dedupe_key) do nothing;

    if found then v_inserted := v_inserted + 1; end if;

  end loop;

  return jsonb_build_object(
    'ok', true,
    'now', p_now,
    'inserted', v_inserted
  );
end;
$$;

-- 4) Create/replace the cron job: run every minute
-- NOTE: cron job names must be unique. If you re-run migration, you may need to unschedule old job manually.
-- We use a safe schedule registration block.
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'pulse_scheduler_tick_every_minute') then
    perform cron.schedule(
      'pulse_scheduler_tick_every_minute',
      '* * * * *',
      $$ select public.rpc_scheduler_tick(now()); $$
    );
  end if;
end
$$;

commit;
