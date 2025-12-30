begin;

-- ============================================================
-- PULSE CANON ENFORCEMENT v2
-- Implements:
--  A) public.pulse_canon_gate()  -> canonical release/CI gate
--  B) public.create_canonical_user_table(schema, table, with_id) -> compliant table factory
--  C) Event-trigger locks:
--     - disallow disabling RLS on any table that has user_id
--     - disallow dropping/altering canonical policy pulse_user_owns_row
-- ============================================================

-- -------------------------
-- A) Canon Gate (CI / release gate)
-- -------------------------
create or replace function public.pulse_canon_gate()
returns void
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  -- Existing canon assertions (already in your system)
  perform public.assert_schema_identity();
  perform public.assert_no_user_id_fks();

  -- Optional: if your audit view exists, require it to be clean
  -- (This is your strongest "single pane of glass" signal.)
  if to_regclass('public.user_id_canon_audit') is not null then
    execute $q$
      select count(*)
      from public.user_id_canon_audit
      where
        user_id_not_text = true
        or rls_enabled = false
        or has_pulse_user_owns_row = false
        or user_id_fk_violations_global > 0
    $q$ into v_count;

    if v_count > 0 then
      raise exception 'PULSE CANON GATE FAILED: user_id_canon_audit has % violating rows', v_count;
    end if;
  end if;
end;
$$;

revoke all on function public.pulse_canon_gate() from public;
grant execute on function public.pulse_canon_gate() to postgres, service_role;


-- -------------------------
-- Helpers already implied by your canon: current_user_sub()
-- (If it already exists, this is idempotent.)
-- -------------------------
create or replace function public.current_user_sub()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'sub', nullif(current_setting('request.jwt.claim.sub', true), ''), null);
$$;

revoke all on function public.current_user_sub() from public;
grant execute on function public.current_user_sub() to anon, authenticated, service_role, postgres;


-- -------------------------
-- B) Canonical Table Factory
-- Creates a table with:
--   - user_id TEXT NOT NULL default current_user_sub()
--   - created_at/updated_at
--   - optional id uuid PK
-- Enables RLS and installs canonical pulse_user_owns_row policy
-- -------------------------
create or replace function public.create_canonical_user_table(
  p_schema text,
  p_table  text,
  p_with_id boolean default true
)
returns void
language plpgsql
security definer
as $$
declare
  fqtn text := format('%I.%I', p_schema, p_table);
  tbl regclass;
begin
  if p_schema is null or p_schema = '' or p_table is null or p_table = '' then
    raise exception 'schema/table required';
  end if;

  -- Create table if missing
  if to_regclass(fqtn) is null then
    if p_with_id then
      execute format($sql$
        create table %s (
          id uuid primary key default gen_random_uuid(),
          user_id text not null default public.current_user_sub(),
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );
      $sql$, fqtn);
    else
      execute format($sql$
        create table %s (
          user_id text not null default public.current_user_sub(),
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );
      $sql$, fqtn);
    end if;
  end if;

  -- Ensure user_id is TEXT (canon)
  execute format($sql$
    do $do$
    begin
      if exists (
        select 1
        from information_schema.columns
        where table_schema = %L
          and table_name = %L
          and column_name = 'user_id'
          and data_type <> 'text'
      ) then
        raise exception 'Canon violation: %.% user_id must be TEXT', %L, %L;
      end if;
    end
    $do$;
  $sql$, p_schema, p_table, p_schema, p_table);

  -- Enable RLS
  execute format('alter table %s enable row level security;', fqtn);

  -- Create canonical policy (drop+create to ensure exact definition)
  -- We do DROP POLICY IF EXISTS because Postgres does not support CREATE POLICY IF NOT EXISTS across all versions.
  execute format('drop policy if exists pulse_user_owns_row on %s;', fqtn);

  execute format($sql$
    create policy pulse_user_owns_row
    on %s
    for all
    using (public.current_user_sub() = user_id)
    with check (public.current_user_sub() = user_id);
  $sql$, fqtn);

  -- Gate check
  perform public.pulse_canon_gate();
end;
$$;

revoke all on function public.create_canonical_user_table(text,text,boolean) from public;
grant execute on function public.create_canonical_user_table(text,text,boolean) to postgres, service_role;


-- -------------------------
-- C) Locks: prevent tampering
--   1) Forbid DISABLE RLS on tables that have user_id
--   2) Forbid ALTER/DROP of canonical policy pulse_user_owns_row
--
-- IMPORTANT: We do NOT query pg_event_trigger catalog (avoids your "permission denied for pg_event_trigger" failure).
-- We only use pg_event_trigger_ddl_commands(), which is safe inside event triggers.
-- -------------------------

create or replace function public.pulse_guard_canon_ddl()
returns event_trigger
language plpgsql
security definer
as $$
declare
  r record;
  obj_schema text;
  obj_name text;
  ddl_txt text;
  has_user_id boolean;
begin
  for r in
    select *
    from pg_event_trigger_ddl_commands()
  loop
    ddl_txt := coalesce(r.command::text, '');

    -- Extract schema/table when object_identity looks like: public.table_name
    obj_schema := split_part(r.object_identity, '.', 1);
    obj_name   := split_part(r.object_identity, '.', 2);

    -- 1) Block disabling RLS on any table that has user_id column
    if r.command_tag = 'ALTER TABLE' and ddl_txt ilike '%disable row level security%' then
      if obj_schema <> '' and obj_name <> '' then
        select exists (
          select 1
          from information_schema.columns
          where table_schema = obj_schema
            and table_name = obj_name
            and column_name = 'user_id'
        ) into has_user_id;

        if has_user_id then
          raise exception 'CANON LOCK: cannot DISABLE RLS on %.% (table has user_id)', obj_schema, obj_name;
        end if;
      end if;
    end if;

    -- 2) Block DROP/ALTER of canonical policy pulse_user_owns_row anywhere
    -- object_identity often includes the policy name; ddl text definitely does.
    if (r.command_tag in ('DROP POLICY','ALTER POLICY')) then
      if ddl_txt ilike '%pulse_user_owns_row%' then
        raise exception 'CANON LOCK: pulse_user_owns_row policy is protected and cannot be altered/dropped';
      end if;
    end if;

  end loop;
end;
$$;

revoke all on function public.pulse_guard_canon_ddl() from public;
grant execute on function public.pulse_guard_canon_ddl() to postgres, service_role;

-- Install / replace the event trigger
drop event trigger if exists pulse_guard_canon_ddl;
create event trigger pulse_guard_canon_ddl
on ddl_command_end
execute function public.pulse_guard_canon_ddl();


-- Final smoke gate
select public.pulse_canon_gate();

commit;
