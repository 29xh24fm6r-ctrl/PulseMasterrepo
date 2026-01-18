-- Migration to fix assert_schema_identity to accept v2_uuid_hard

CREATE OR REPLACE FUNCTION "public"."assert_schema_identity"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_mode text;
  v_count int;
begin
  select mode into v_mode
  from public.canon_mode
  where id = true;

  if v_mode = 'v1_text' then
    -- Canon V1: user_id MUST be TEXT
    select count(*) into v_count
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'user_id'
      and data_type <> 'text';

    if v_count > 0 then
      raise exception
        'CANONICAL VIOLATION (V1): Found % user_id columns not TEXT',
        v_count;
    end if;

  elsif v_mode = 'v2_uuid' or v_mode = 'v2_uuid_hard' then
    -- Canon V2: user_id MUST be UUID
    select count(*) into v_count
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'user_id'
      and data_type <> 'uuid';

    if v_count > 0 then
      raise exception
        'CANONICAL VIOLATION (V2): Found % user_id columns not UUID',
        v_count;
    end if;

  else
    raise exception 'Unknown canon_mode: %', v_mode;
  end if;
end;
$$;

ALTER FUNCTION "public"."assert_schema_identity"() OWNER TO "postgres";
