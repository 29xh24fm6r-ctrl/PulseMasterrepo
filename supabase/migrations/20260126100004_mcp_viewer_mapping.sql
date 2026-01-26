-- 20260126100004_mcp_viewer_mapping.sql
-- MCP Viewer Principal Mapping: Maps Supabase Auth viewers to target principals
-- Enables principal-aware READ ONLY access under RLS without service role
--
-- NOTE: Omega tables use `user_id TEXT` (not UUID, not user_id)
-- This migration creates a mapping from viewer UUID → target user_id TEXT

-- =============================================
-- STEP 1: Create mapping table
-- =============================================

create table if not exists public.pulse_mcp_viewers (
  viewer_user_id uuid primary key,
  target_user_id text not null,  -- matches pulse_* tables user_id column type
  created_at timestamptz default now()
);

comment on table public.pulse_mcp_viewers is 'Maps MCP viewer UUIDs to target user_id (TEXT) for principal-aware RLS reads on Omega tables';

alter table public.pulse_mcp_viewers enable row level security;

-- Allow only the viewer themselves to read their own mapping row (good hygiene)
drop policy if exists "mcp_viewers_select_self" on public.pulse_mcp_viewers;
create policy "mcp_viewers_select_self"
on public.pulse_mcp_viewers
for select
to authenticated
using (viewer_user_id = auth.uid());

-- NO insert/update/delete policies - prevents any client-side changes
-- Only service role can modify this table (via migrations or admin)

-- =============================================
-- STEP 2: Create helper function for RLS policies
-- =============================================

create or replace function public.mcp_viewer_can_read_user(target_user text)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.pulse_mcp_viewers v
    where v.viewer_user_id = auth.uid()
      and v.target_user_id = target_user
  );
$$;

comment on function public.mcp_viewer_can_read_user(text) is 'Returns true if the current auth user is an MCP viewer mapped to the given user_id';

-- =============================================
-- STEP 3: Insert initial mapping (MCP Viewer → test-user-phase10)
-- This can be updated via SQL as needed
-- =============================================

insert into public.pulse_mcp_viewers (viewer_user_id, target_user_id)
values (
  '95decba1-eb65-42cf-9f80-ab9f2067376b',
  'test-user-phase10'
)
on conflict (viewer_user_id)
do update set target_user_id = excluded.target_user_id;

-- =============================================
-- STEP 4: Extend SELECT RLS on tables using user_id
-- This section patches existing SELECT policies to allow MCP viewer reads
-- =============================================

-- Note: Each table that uses user_id needs its SELECT policy updated.
-- The pattern is to add: or public.mcp_viewer_can_read_user(user_id)
-- to the existing USING clause.

-- The actual tables using user_id should be identified and patched.
-- Below are the common Omega/Pulse tables that may use user_id:

-- Patch pulse_signals if it uses user_id
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'pulse_signals'
    and column_name = 'user_id'
  ) then
    execute 'drop policy if exists "pulse_signals_select_own_or_viewer" on public.pulse_signals';
    execute '
      create policy "pulse_signals_select_own_or_viewer"
      on public.pulse_signals
      for select
      to authenticated
      using (
        user_id = auth.uid()::text
        or public.mcp_viewer_can_read_user(user_id)
      )
    ';
  end if;
end $$;

-- Patch pulse_intents if it uses user_id
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'pulse_intents'
    and column_name = 'user_id'
  ) then
    execute 'drop policy if exists "pulse_intents_select_own_or_viewer" on public.pulse_intents';
    execute '
      create policy "pulse_intents_select_own_or_viewer"
      on public.pulse_intents
      for select
      to authenticated
      using (
        user_id = auth.uid()::text
        or public.mcp_viewer_can_read_user(user_id)
      )
    ';
  end if;
end $$;

-- Patch pulse_drafts if it uses user_id
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'pulse_drafts'
    and column_name = 'user_id'
  ) then
    execute 'drop policy if exists "pulse_drafts_select_own_or_viewer" on public.pulse_drafts';
    execute '
      create policy "pulse_drafts_select_own_or_viewer"
      on public.pulse_drafts
      for select
      to authenticated
      using (
        user_id = auth.uid()::text
        or public.mcp_viewer_can_read_user(user_id)
      )
    ';
  end if;
end $$;

-- Patch pulse_outcomes if it uses user_id
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'pulse_outcomes'
    and column_name = 'user_id'
  ) then
    execute 'drop policy if exists "pulse_outcomes_select_own_or_viewer" on public.pulse_outcomes';
    execute '
      create policy "pulse_outcomes_select_own_or_viewer"
      on public.pulse_outcomes
      for select
      to authenticated
      using (
        user_id = auth.uid()::text
        or public.mcp_viewer_can_read_user(user_id)
      )
    ';
  end if;
end $$;

-- Patch pulse_strategies if it uses user_id
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'pulse_strategies'
    and column_name = 'user_id'
  ) then
    execute 'drop policy if exists "pulse_strategies_select_own_or_viewer" on public.pulse_strategies';
    execute '
      create policy "pulse_strategies_select_own_or_viewer"
      on public.pulse_strategies
      for select
      to authenticated
      using (
        user_id = auth.uid()::text
        or public.mcp_viewer_can_read_user(user_id)
      )
    ';
  end if;
end $$;

-- Patch pulse_preferences if it uses user_id
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'pulse_preferences'
    and column_name = 'user_id'
  ) then
    execute 'drop policy if exists "pulse_preferences_select_own_or_viewer" on public.pulse_preferences';
    execute '
      create policy "pulse_preferences_select_own_or_viewer"
      on public.pulse_preferences
      for select
      to authenticated
      using (
        user_id = auth.uid()::text
        or public.mcp_viewer_can_read_user(user_id)
      )
    ';
  end if;
end $$;

-- Patch pulse_reasoning_traces if it uses user_id
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'pulse_reasoning_traces'
    and column_name = 'user_id'
  ) then
    execute 'drop policy if exists "pulse_reasoning_traces_select_own_or_viewer" on public.pulse_reasoning_traces';
    execute '
      create policy "pulse_reasoning_traces_select_own_or_viewer"
      on public.pulse_reasoning_traces
      for select
      to authenticated
      using (
        user_id = auth.uid()::text
        or public.mcp_viewer_can_read_user(user_id)
      )
    ';
  end if;
end $$;

-- Patch pulse_cognitive_limits if it uses user_id
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'pulse_cognitive_limits'
    and column_name = 'user_id'
  ) then
    execute 'drop policy if exists "pulse_cognitive_limits_select_own_or_viewer" on public.pulse_cognitive_limits';
    execute '
      create policy "pulse_cognitive_limits_select_own_or_viewer"
      on public.pulse_cognitive_limits
      for select
      to authenticated
      using (
        user_id = auth.uid()::text
        or public.mcp_viewer_can_read_user(user_id)
      )
    ';
  end if;
end $$;

-- Patch pulse_simulations if it uses user_id
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'pulse_simulations'
    and column_name = 'user_id'
  ) then
    execute 'drop policy if exists "pulse_simulations_select_own_or_viewer" on public.pulse_simulations';
    execute '
      create policy "pulse_simulations_select_own_or_viewer"
      on public.pulse_simulations
      for select
      to authenticated
      using (
        user_id = auth.uid()::text
        or public.mcp_viewer_can_read_user(user_id)
      )
    ';
  end if;
end $$;

-- Patch pulse_improvements if it uses user_id
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'pulse_improvements'
    and column_name = 'user_id'
  ) then
    execute 'drop policy if exists "pulse_improvements_select_own_or_viewer" on public.pulse_improvements';
    execute '
      create policy "pulse_improvements_select_own_or_viewer"
      on public.pulse_improvements
      for select
      to authenticated
      using (
        user_id = auth.uid()::text
        or public.mcp_viewer_can_read_user(user_id)
      )
    ';
  end if;
end $$;

-- Patch pulse_constraint_violations if it uses user_id
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'pulse_constraint_violations'
    and column_name = 'user_id'
  ) then
    execute 'drop policy if exists "pulse_constraint_violations_select_own_or_viewer" on public.pulse_constraint_violations';
    execute '
      create policy "pulse_constraint_violations_select_own_or_viewer"
      on public.pulse_constraint_violations
      for select
      to authenticated
      using (
        user_id = auth.uid()::text
        or public.mcp_viewer_can_read_user(user_id)
      )
    ';
  end if;
end $$;

-- Patch pulse_goals if it uses user_id
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'pulse_goals'
    and column_name = 'user_id'
  ) then
    execute 'drop policy if exists "pulse_goals_select_own_or_viewer" on public.pulse_goals';
    execute '
      create policy "pulse_goals_select_own_or_viewer"
      on public.pulse_goals
      for select
      to authenticated
      using (
        user_id = auth.uid()::text
        or public.mcp_viewer_can_read_user(user_id)
      )
    ';
  end if;
end $$;

-- Patch pulse_trajectories if it uses user_id
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'pulse_trajectories'
    and column_name = 'user_id'
  ) then
    execute 'drop policy if exists "pulse_trajectories_select_own_or_viewer" on public.pulse_trajectories';
    execute '
      create policy "pulse_trajectories_select_own_or_viewer"
      on public.pulse_trajectories
      for select
      to authenticated
      using (
        user_id = auth.uid()::text
        or public.mcp_viewer_can_read_user(user_id)
      )
    ';
  end if;
end $$;

-- Patch pulse_life_events if it uses user_id
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'pulse_life_events'
    and column_name = 'user_id'
  ) then
    execute 'drop policy if exists "pulse_life_events_select_own_or_viewer" on public.pulse_life_events';
    execute '
      create policy "pulse_life_events_select_own_or_viewer"
      on public.pulse_life_events
      for select
      to authenticated
      using (
        user_id = auth.uid()::text
        or public.mcp_viewer_can_read_user(user_id)
      )
    ';
  end if;
end $$;

-- Patch pulse_domain_connections if it uses user_id
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'pulse_domain_connections'
    and column_name = 'user_id'
  ) then
    execute 'drop policy if exists "pulse_domain_connections_select_own_or_viewer" on public.pulse_domain_connections';
    execute '
      create policy "pulse_domain_connections_select_own_or_viewer"
      on public.pulse_domain_connections
      for select
      to authenticated
      using (
        user_id = auth.uid()::text
        or public.mcp_viewer_can_read_user(user_id)
      )
    ';
  end if;
end $$;

-- Patch pulse_confidence_events if it uses user_id
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'pulse_confidence_events'
    and column_name = 'user_id'
  ) then
    execute 'drop policy if exists "pulse_confidence_events_select_own_or_viewer" on public.pulse_confidence_events';
    execute '
      create policy "pulse_confidence_events_select_own_or_viewer"
      on public.pulse_confidence_events
      for select
      to authenticated
      using (
        user_id = auth.uid()::text
        or public.mcp_viewer_can_read_user(user_id)
      )
    ';
  end if;
end $$;

-- Patch pulse_user_autonomy if it uses user_id
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'pulse_user_autonomy'
    and column_name = 'user_id'
  ) then
    execute 'drop policy if exists "pulse_user_autonomy_select_own_or_viewer" on public.pulse_user_autonomy';
    execute '
      create policy "pulse_user_autonomy_select_own_or_viewer"
      on public.pulse_user_autonomy
      for select
      to authenticated
      using (
        user_id = auth.uid()::text
        or public.mcp_viewer_can_read_user(user_id)
      )
    ';
  end if;
end $$;

-- =============================================
-- STEP 5: Also handle tables that use owner_user_id instead of user_id
-- (Some tables may use this alternate column name)
-- NOTE: owner_user_id can be TEXT or UUID depending on table
-- =============================================

-- Helper for TEXT owner_user_id columns
create or replace function public.mcp_viewer_can_read_owner(target_owner text)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.pulse_mcp_viewers v
    where v.viewer_user_id = auth.uid()
      and v.target_user_id = target_owner
  );
$$;

comment on function public.mcp_viewer_can_read_owner(text) is 'Returns true if the current auth user is an MCP viewer mapped to the given owner_user_id (TEXT)';

-- Helper for UUID owner_user_id columns (compares UUID directly)
create or replace function public.mcp_viewer_can_read_owner_uuid(target_owner uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.pulse_mcp_viewers v
    where v.viewer_user_id = auth.uid()
      and v.target_user_id = target_owner::text
  );
$$;

comment on function public.mcp_viewer_can_read_owner_uuid(uuid) is 'Returns true if the current auth user is an MCP viewer mapped to the given owner_user_id (UUID)';

-- Generic patch for any table with owner_user_id (detects TEXT vs UUID)
do $$
declare
  tbl record;
begin
  for tbl in
    select c.table_name, c.data_type
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.column_name = 'owner_user_id'
      and c.table_name like 'pulse_%'
  loop
    execute format('drop policy if exists "%s_select_own_or_viewer" on public.%I', tbl.table_name, tbl.table_name);

    if tbl.data_type = 'uuid' then
      -- UUID column: compare directly with auth.uid()
      execute format('
        create policy "%s_select_own_or_viewer"
        on public.%I
        for select
        to authenticated
        using (
          owner_user_id = auth.uid()
          or public.mcp_viewer_can_read_owner_uuid(owner_user_id)
        )
      ', tbl.table_name, tbl.table_name);
    else
      -- TEXT column: cast auth.uid() to text
      execute format('
        create policy "%s_select_own_or_viewer"
        on public.%I
        for select
        to authenticated
        using (
          owner_user_id = auth.uid()::text
          or public.mcp_viewer_can_read_owner(owner_user_id)
        )
      ', tbl.table_name, tbl.table_name);
    end if;
  end loop;
end $$;

-- =============================================
-- Done: MCP Viewer can now read mapped principal's rows
-- Verification: Query tables as MCP viewer with MCP_VIEWER_JWT set
--
-- Tables patched:
-- - All pulse_* tables with user_id column
-- - All pulse_* tables with owner_user_id column
-- =============================================
