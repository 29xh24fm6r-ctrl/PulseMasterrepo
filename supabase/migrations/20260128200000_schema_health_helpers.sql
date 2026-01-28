-- ============================================
-- SCHEMA HEALTH HELPERS
-- Read-only SQL RPCs for system_schema_health MCP tool
-- Idempotent: CREATE OR REPLACE
-- ============================================

-- Check if a table exists in the public schema
CREATE OR REPLACE FUNCTION table_exists(tbl text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = tbl
  );
$$;

-- Check if RLS is enabled on a table
CREATE OR REPLACE FUNCTION table_rls_enabled(tbl text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT relrowsecurity
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = tbl),
    false
  );
$$;

-- List all policy names on a table
CREATE OR REPLACE FUNCTION table_policies(tbl text)
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(array_agg(policyname), '{}')
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = tbl;
$$;
