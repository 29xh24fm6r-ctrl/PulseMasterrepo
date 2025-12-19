-- Sprint 4.1: Health check helper functions
-- supabase/migrations/20241216_sprint4_1_health_helpers.sql

-- ============================================
-- RLS Policies Helper Function
-- ============================================

-- Function to get RLS policies for a schema
CREATE OR REPLACE FUNCTION public.get_rls_policies(schema_name text)
RETURNS TABLE (
  tablename text,
  policyname text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.tablename::text,
    p.policyname::text
  FROM pg_policies p
  WHERE p.schemaname = schema_name;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_rls_policies(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rls_policies(text) TO anon;

-- ============================================
-- User ID Columns Helper Function
-- ============================================

-- Function to check user_id column types
CREATE OR REPLACE FUNCTION public.get_user_id_columns(
  schema_name text,
  table_names text[]
)
RETURNS TABLE (
  table_name text,
  data_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.table_name::text,
    c.data_type::text
  FROM information_schema.columns c
  WHERE c.table_schema = schema_name
    AND c.table_name = ANY(table_names)
    AND c.column_name = 'user_id';
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_id_columns(text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_id_columns(text, text[]) TO anon;

-- ============================================
-- Guard: User ID Types Check (for CI/CD)
-- ============================================

-- Function to check user_id column types for guard script
CREATE OR REPLACE FUNCTION public.guard_user_id_types()
RETURNS TABLE (
  table_name text,
  user_id_data_type text,
  ok boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_tables text[] := ARRAY[
    'crm_contacts',
    'tasks',
    'deals',
    'habits',
    'habit_logs',
    'journal_entries'
  ];
  tbl text;
  col_type text;
BEGIN
  FOR tbl IN SELECT unnest(target_tables) LOOP
    SELECT data_type::text INTO col_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = tbl
      AND column_name = 'user_id';
    
    IF col_type IS NULL THEN
      RETURN QUERY SELECT tbl::text, NULL::text, false::boolean;
    ELSIF col_type = 'uuid' THEN
      RETURN QUERY SELECT tbl::text, col_type, true::boolean;
    ELSE
      RETURN QUERY SELECT tbl::text, col_type, false::boolean;
    END IF;
  END LOOP;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.guard_user_id_types() TO authenticated;
GRANT EXECUTE ON FUNCTION public.guard_user_id_types() TO anon;

