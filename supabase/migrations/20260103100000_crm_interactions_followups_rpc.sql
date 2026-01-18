-- 20260103_crm_interactions_followups_rpc.sql
-- RPC spine for CRM writes: interactions add + followups mark done
-- Safe for service-role execution via API routes.

begin;

-- Helper: detect canon_events table optionally
-- We'll conditionally insert into canon_events if it exists.
create or replace function public._pulse_table_exists(p_reg regclass)
returns boolean
language sql
stable
as $$
  select p_reg is not null;
$$;

-- 1) Add CRM Interaction
create or replace function public.crm_interaction_add(
  p_owner_user_id text,
  p_contact_id uuid,
  p_type text,
  p_channel text default null,
  p_happened_at timestamptz default now(),
  p_summary text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_canon regclass;
begin
  if p_owner_user_id is null or length(trim(p_owner_user_id)) = 0 then
    raise exception 'p_owner_user_id is required';
  end if;

  if p_contact_id is null then
    raise exception 'p_contact_id is required';
  end if;

  insert into public.crm_interactions (
    owner_user_id,
    contact_id,
    type,
    channel,
    happened_at,
    summary,
    metadata
  )
  values (
    p_owner_user_id,
    p_contact_id,
    nullif(trim(p_type), ''),
    nullif(trim(p_channel), ''),
    coalesce(p_happened_at, now()),
    p_summary,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  -- Optional: emit into canon_events if that table exists (for Oracle ingestion)
  select to_regclass('public.canon_events') into v_canon;

  if public._pulse_table_exists(v_canon) then
    execute format($fmt$
      insert into public.canon_events (
        owner_user_id,
        event_type,
        occurred_at,
        payload
      ) values ($1, $2, $3, $4)
    $fmt$)
    using
      p_owner_user_id,
      'crm_interaction',
      coalesce(p_happened_at, now()),
      jsonb_build_object(
        'interaction_id', v_id,
        'contact_id', p_contact_id,
        'type', p_type,
        'channel', p_channel,
        'summary', p_summary,
        'metadata', coalesce(p_metadata, '{}'::jsonb)
      );
  end if;

  return v_id;
end;
$$;

-- 2) Mark Followup Done
create or replace function public.crm_followup_mark_done(
  p_owner_user_id text,
  p_followup_id uuid,
  p_done_at timestamptz default now(),
  p_outcome text default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_canon regclass;
begin
  if p_owner_user_id is null or length(trim(p_owner_user_id)) = 0 then
    raise exception 'p_owner_user_id is required';
  end if;

  if p_followup_id is null then
    raise exception 'p_followup_id is required';
  end if;

  update public.crm_followups
     set status = 'done',
         completed_at = coalesce(p_done_at, now()),
         outcome = coalesce(nullif(trim(p_outcome), ''), outcome),
         notes = coalesce(p_notes, notes),
         updated_at = now()
   where id = p_followup_id
     and owner_user_id = p_owner_user_id;

  if not found then
    raise exception 'followup not found (or not owned by user)';
  end if;

  -- Optional: emit into canon_events if exists
  select to_regclass('public.canon_events') into v_canon;

  if public._pulse_table_exists(v_canon) then
    execute format($fmt$
      insert into public.canon_events (
        owner_user_id,
        event_type,
        occurred_at,
        payload
      ) values ($1, $2, $3, $4)
    $fmt$)
    using
      p_owner_user_id,
      'crm_followup_done',
      coalesce(p_done_at, now()),
      jsonb_build_object(
        'followup_id', p_followup_id,
        'outcome', p_outcome,
        'notes', p_notes
      );
  end if;

  return;
end;
$$;

-- Lock down: only service_role should execute these RPCs (API calls via service key)
revoke all on function public.crm_interaction_add(text, uuid, text, text, timestamptz, text, jsonb) from public;
revoke all on function public.crm_followup_mark_done(text, uuid, timestamptz, text, text) from public;

commit;
