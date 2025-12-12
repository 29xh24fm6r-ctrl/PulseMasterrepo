-- RLS Owner Policies - Enable RLS and create owner-only policies for all user-owned tables
-- supabase/migrations/007_rls_owner_policies.sql

-- Helper function to enable RLS and create owner policies for a table
CREATE OR REPLACE FUNCTION enable_owner_rls(table_name TEXT) RETURNS VOID AS $$
BEGIN
  -- Enable RLS
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
  
  -- Drop existing policies if any
  EXECUTE format('DROP POLICY IF EXISTS owner_only_select ON %I', table_name);
  EXECUTE format('DROP POLICY IF EXISTS owner_only_insert ON %I', table_name);
  EXECUTE format('DROP POLICY IF EXISTS owner_only_update ON %I', table_name);
  EXECUTE format('DROP POLICY IF EXISTS owner_only_delete ON %I', table_name);
  
  -- Create owner-only policies
  -- SELECT
  EXECUTE format('
    CREATE POLICY owner_only_select ON %I
    FOR SELECT
    USING (owner_user_id = (auth.jwt() ->> ''sub'')::text)
  ', table_name);
  
  -- INSERT
  EXECUTE format('
    CREATE POLICY owner_only_insert ON %I
    FOR INSERT
    WITH CHECK (owner_user_id = (auth.jwt() ->> ''sub'')::text)
  ', table_name);
  
  -- UPDATE
  EXECUTE format('
    CREATE POLICY owner_only_update ON %I
    FOR UPDATE
    USING (owner_user_id = (auth.jwt() ->> ''sub'')::text)
    WITH CHECK (owner_user_id = (auth.jwt() ->> ''sub'')::text)
  ', table_name);
  
  -- DELETE
  EXECUTE format('
    CREATE POLICY owner_only_delete ON %I
    FOR DELETE
    USING (owner_user_id = (auth.jwt() ->> ''sub'')::text)
  ', table_name);
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on CRM tables
SELECT enable_owner_rls('crm_contacts');
SELECT enable_owner_rls('crm_organizations');
SELECT enable_owner_rls('crm_deals');

-- Enable RLS on tables that exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_interactions') THEN
    PERFORM enable_owner_rls('crm_interactions');
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_tasks') THEN
    PERFORM enable_owner_rls('crm_tasks');
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_contact_org_links') THEN
    PERFORM enable_owner_rls('crm_contact_org_links');
  END IF;
END $$;

-- Second Brain tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tb_nodes') THEN
    PERFORM enable_owner_rls('tb_nodes');
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tb_edges') THEN
    PERFORM enable_owner_rls('tb_edges');
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tb_memory_fragments') THEN
    PERFORM enable_owner_rls('tb_memory_fragments');
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tb_raw_events') THEN
    PERFORM enable_owner_rls('tb_raw_events');
  END IF;
END $$;

-- Call/Meeting tables
SELECT enable_owner_rls('call_sessions');
SELECT enable_owner_rls('call_segments');
SELECT enable_owner_rls('call_summaries');

-- Calendar/Email tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events_cache') THEN
    PERFORM enable_owner_rls('calendar_events_cache');
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_threads') THEN
    PERFORM enable_owner_rls('email_threads');
  END IF;
END $$;

-- Cleanup function (optional, can keep for future use)
-- DROP FUNCTION IF EXISTS enable_owner_rls(TEXT);

