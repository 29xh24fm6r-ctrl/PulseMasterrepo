/*
PULSE — ALL 4 AT ONCE (FIXED)
Fixes the syntax error you hit: in PL/pgSQL, EXCEPTION must be inside a BEGIN...END block.

Includes:
1) RLS zero-policy audit (views)
2) user_id_uuid NOT NULL (NOT VALID check) + FK (NOT VALID) when a users table is discoverable
3) missing indexes for user_id_uuid + owner_user_id
4) deny-all “service-role-only” policy for internal-ish tables (RLS-enabled)

Idempotent + safe: skips if already exists / keeps going on failures.
*/

set search_path = public;

-- =========================================================
-- 0) Discover a "users" table with a UUID primary key
-- =========================================================
do $$
declare
  v_users regclass;
begin
  select c.oid::regclass
    into v_users
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname in ('users','user_profiles','profiles','app_users')
    and exists (
      select 1
      from pg_index i
      join pg_attribute a
        on a.attrelid = i.indrelid
       and a.attnum = any(i.indkey)
      where i.indrelid = c.oid
        and i.indisprimary
        and a.atttypid = 'uuid'::regtype
    )
  order by
    case c.relname
      when 'users' then 1
      when 'user_profiles' then 2
      when 'profiles' then 3
      when 'app_users' then 4
      else 99
    end
  limit 1;

  perform set_config('pulse.users_table', coalesce(v_users::text,''), true);
end $$;

-- =========================================================
-- 1) RLS ZERO-POLICY AUDIT (REPORT)
-- =========================================================
drop view if exists public.pulse_rls_zero_policies cascade;
create view public.pulse_rls_zero_policies as
select
  n.nspname as schema_name,
  c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity
  and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
order by 1,2;

drop view if exists public.pulse_rls_summary cascade;
create view public.pulse_rls_summary as
select
  count(*) filter (where c.relkind='r') as tables_total,
  count(*) filter (where c.relkind='r' and c.relrowsecurity) as tables_rls_enabled,
  count(*) filter (
    where c.relkind='r'
      and c.relrowsecurity
      and not exists (select 1 from pg_policy p where p.polrelid=c.oid)
  ) as tables_rls_enabled_zero_policies
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public';

-- =========================================================
-- 2) user_id_uuid NOT NULL (NOT VALID) + FK (NOT VALID)
-- =========================================================
do $$
declare
  r record;
  v_users text := current_setting('pulse.users_table', true);
  v_users_reg regclass;
  v_users_pk_col name;
  v_chk_name text;
  v_fk_name text;
  v_users_table_name text;
begin
  if v_users is not null and v_users <> '' then
    v_users_reg := v_users::regclass;
    select relname into v_users_table_name from pg_class where oid=v_users_reg;

    select a.attname
      into v_users_pk_col
    from pg_index i
    join pg_attribute a
      on a.attrelid=i.indrelid
     and a.attnum=any(i.indkey)
    where i.indrelid = v_users_reg
      and i.indisprimary
      and a.atttypid = 'uuid'::regtype
    limit 1;
  end if;

  -- (a) Add NOT VALID check constraints for user_id_uuid IS NOT NULL
  for r in
    select c.table_schema, c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema=c.table_schema
     and t.table_name=c.table_name
    where c.table_schema='public'
      and t.table_type='BASE TABLE'
      and c.column_name='user_id_uuid'
      and c.data_type='uuid'
    group by 1,2
  loop
    v_chk_name := format('ck_%s_user_id_uuid_not_null', r.table_name);

    if not exists (
      select 1
      from pg_constraint con
      where con.connamespace='public'::regnamespace
        and con.conrelid = format('%I.%I', r.table_schema, r.table_name)::regclass
        and con.conname = v_chk_name
    ) then
      begin
        execute format(
          'alter table %I.%I add constraint %I check (user_id_uuid is not null) not valid',
          r.table_schema, r.table_name, v_chk_name
        );
      exception when others then
        null;
      end;
    end if;
  end loop;

  -- (b) Add NOT VALID FK constraints (only if users table + pk col found)
  if v_users is not null and v_users <> '' and v_users_pk_col is not null then
    for r in
      select c.table_schema, c.table_name
      from information_schema.columns c
      join information_schema.tables t
        on t.table_schema=c.table_schema
       and t.table_name=c.table_name
      where c.table_schema='public'
        and t.table_type='BASE TABLE'
        and c.column_name='user_id_uuid'
        and c.data_type='uuid'
        and c.table_name <> v_users_table_name
      group by 1,2
    loop
      v_fk_name := format('fk_%s_user_id_uuid__%s', r.table_name, replace(v_users_reg::text,'.','_'));

      if not exists (
        select 1
        from pg_constraint con
        where con.connamespace='public'::regnamespace
          and con.conrelid = format('%I.%I', r.table_schema, r.table_name)::regclass
          and con.conname = v_fk_name
      ) then
        begin
          execute format(
            'alter table %I.%I add constraint %I foreign key (user_id_uuid) references %s(%I) not valid',
            r.table_schema, r.table_name, v_fk_name, v_users_reg::text, v_users_pk_col
          );
        exception when others then
          null;
        end;
      end if;
    end loop;
  end if;
end $$;

-- =========================================================
-- 3) INDEX PASS (MISSING ONLY): user_id_uuid + owner_user_id
-- =========================================================
do $$
declare
  r record;
  v_idx_name text;
begin
  -- user_id_uuid
  for r in
    select c.table_schema, c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema=c.table_schema
     and t.table_name=c.table_name
    where c.table_schema='public'
      and t.table_type='BASE TABLE'
      and c.column_name='user_id_uuid'
      and c.data_type='uuid'
    group by 1,2
  loop
    v_idx_name := format('idx_%s_user_id_uuid', r.table_name);

    if not exists (
      select 1
      from pg_class ic
      join pg_namespace inx on inx.oid=ic.relnamespace
      where inx.nspname='public'
        and ic.relkind='i'
        and ic.relname=v_idx_name
    ) then
      begin
        execute format('create index %I on %I.%I (user_id_uuid)', v_idx_name, r.table_schema, r.table_name);
      exception when others then
        null;
      end;
    end if;
  end loop;

  -- owner_user_id (text)
  for r in
    select c.table_schema, c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema=c.table_schema
     and t.table_name=c.table_name
    where c.table_schema='public'
      and t.table_type='BASE TABLE'
      and c.column_name='owner_user_id'
      and c.data_type='text'
    group by 1,2
  loop
    v_idx_name := format('idx_%s_owner_user_id', r.table_name);

    if not exists (
      select 1
      from pg_class ic
      join pg_namespace inx on inx.oid=ic.relnamespace
      where inx.nspname='public'
        and ic.relkind='i'
        and ic.relname=v_idx_name
    ) then
      begin
        execute format('create index %I on %I.%I (owner_user_id)', v_idx_name, r.table_schema, r.table_name);
      exception when others then
        null;
      end;
    end if;
  end loop;
end $$;

-- =========================================================
-- 4) DENY-ALL POLICY FOR INTERNAL-ISH TABLES (RLS ENABLED)
-- =========================================================
do $$
declare
  r record;
  v_policy_name text := 'deny_all__service_role_only';
begin
  for r in
    select n.nspname as schema_name, c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relkind='r'
      and c.relrowsecurity
      and (
        c.relname like '\_%' escape '\'
        or c.relname in (
          'job_queue','job_requests','job_runs',
          'email_send_audit','notification_log',
          '_pulse_renamed_user_id_columns'
        )
      )
  loop
    if not exists (
      select 1
      from pg_policy p
      where p.polrelid = format('%I.%I', r.schema_name, r.table_name)::regclass
        and p.polname = v_policy_name
    ) then
      begin
        execute format(
          'create policy %I on %I.%I for all using (false) with check (false)',
          v_policy_name, r.schema_name, r.table_name
        );
      exception when others then
        null;
      end;
    end if;
  end loop;
end $$;

-- =========================================================
-- OUTPUTS
-- =========================================================
select * from public.pulse_rls_summary;
select * from public.pulse_rls_zero_policies;

-- NOT VALID checks added (user_id_uuid not null)
select
  conrelid::regclass as table_name,
  conname,
  convalidated
from pg_constraint
where connamespace = 'public'::regnamespace
  and contype = 'c'
  and conname like 'ck_%_user_id_uuid_not_null'
order by 1,2;

-- NOT VALID FKs added (user_id_uuid -> users.*)
select
  conrelid::regclass as table_name,
  conname,
  convalidated
from pg_constraint
where connamespace = 'public'::regnamespace
  and contype = 'f'
  and conname like 'fk_%_user_id_uuid__%'
order by 1,2;
