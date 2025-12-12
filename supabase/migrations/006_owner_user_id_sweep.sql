-- Owner User ID Sweep - Ensure all user-owned tables have owner_user_id (Clerk user id)
-- supabase/migrations/006_owner_user_id_sweep.sql

-- CRM Tables
-- Note: These may already have user_id, we'll add owner_user_id and migrate data if needed
DO $$
BEGIN
  -- crm_contacts
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_contacts' AND column_name = 'user_id') THEN
    -- Migrate user_id to owner_user_id if mapping exists, otherwise use placeholder
    ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS owner_user_id TEXT;
    -- TODO: Backfill from users table if needed - for now set to placeholder for dev
    UPDATE crm_contacts SET owner_user_id = user_id::text WHERE owner_user_id IS NULL;
    ALTER TABLE crm_contacts ALTER COLUMN owner_user_id SET NOT NULL;
  ELSE
    ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS owner_user_id TEXT NOT NULL;
  END IF;
  
  -- crm_organizations
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_organizations' AND column_name = 'user_id') THEN
    ALTER TABLE crm_organizations ADD COLUMN IF NOT EXISTS owner_user_id TEXT;
    UPDATE crm_organizations SET owner_user_id = user_id::text WHERE owner_user_id IS NULL;
    ALTER TABLE crm_organizations ALTER COLUMN owner_user_id SET NOT NULL;
  ELSE
    ALTER TABLE crm_organizations ADD COLUMN IF NOT EXISTS owner_user_id TEXT NOT NULL;
  END IF;
  
  -- crm_deals
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_deals' AND column_name = 'user_id') THEN
    ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS owner_user_id TEXT;
    UPDATE crm_deals SET owner_user_id = user_id::text WHERE owner_user_id IS NULL;
    ALTER TABLE crm_deals ALTER COLUMN owner_user_id SET NOT NULL;
  ELSE
    ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS owner_user_id TEXT NOT NULL;
  END IF;
  
  -- crm_interactions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_interactions') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_interactions' AND column_name = 'user_id') THEN
      ALTER TABLE crm_interactions ADD COLUMN IF NOT EXISTS owner_user_id TEXT;
      UPDATE crm_interactions SET owner_user_id = user_id::text WHERE owner_user_id IS NULL;
      ALTER TABLE crm_interactions ALTER COLUMN owner_user_id SET NOT NULL;
    ELSE
      ALTER TABLE crm_interactions ADD COLUMN IF NOT EXISTS owner_user_id TEXT NOT NULL;
    END IF;
  END IF;
  
  -- crm_tasks
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_tasks') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_tasks' AND column_name = 'user_id') THEN
      ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS owner_user_id TEXT;
      UPDATE crm_tasks SET owner_user_id = user_id::text WHERE owner_user_id IS NULL;
      ALTER TABLE crm_tasks ALTER COLUMN owner_user_id SET NOT NULL;
    ELSE
      ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS owner_user_id TEXT NOT NULL;
    END IF;
  END IF;
END $$;

-- Second Brain Tables
-- tb_nodes
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tb_nodes') THEN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tb_nodes' AND column_name = 'user_id') THEN
    ALTER TABLE tb_nodes ADD COLUMN IF NOT EXISTS owner_user_id TEXT;
    UPDATE tb_nodes SET owner_user_id = user_id::text WHERE owner_user_id IS NULL;
    ALTER TABLE tb_nodes ALTER COLUMN owner_user_id SET NOT NULL;
  ELSE
    ALTER TABLE tb_nodes ADD COLUMN IF NOT EXISTS owner_user_id TEXT NOT NULL;
  END IF;
END IF;

-- tb_edges
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tb_edges') THEN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tb_edges' AND column_name = 'user_id') THEN
    ALTER TABLE tb_edges ADD COLUMN IF NOT EXISTS owner_user_id TEXT;
    UPDATE tb_edges SET owner_user_id = user_id::text WHERE owner_user_id IS NULL;
    ALTER TABLE tb_edges ALTER COLUMN owner_user_id SET NOT NULL;
  ELSE
    ALTER TABLE tb_edges ADD COLUMN IF NOT EXISTS owner_user_id TEXT NOT NULL;
  END IF;
END IF;

-- tb_memory_fragments
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tb_memory_fragments') THEN
  ALTER TABLE tb_memory_fragments ADD COLUMN IF NOT EXISTS owner_user_id TEXT NOT NULL DEFAULT 'dev';
  -- Update from related entity if possible, otherwise will need manual backfill
END IF;

-- tb_raw_events (if exists)
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tb_raw_events') THEN
  ALTER TABLE tb_raw_events ADD COLUMN IF NOT EXISTS owner_user_id TEXT NOT NULL DEFAULT 'dev';
END IF;

-- Calendar/Email Tables
-- calendar_events_cache
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events_cache') THEN
  ALTER TABLE calendar_events_cache ADD COLUMN IF NOT EXISTS owner_user_id TEXT NOT NULL DEFAULT 'dev';
END IF;

-- email_threads
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_threads') THEN
  ALTER TABLE email_threads ADD COLUMN IF NOT EXISTS owner_user_id TEXT NOT NULL DEFAULT 'dev';
END IF;

-- Indexes on owner_user_id
CREATE INDEX IF NOT EXISTS idx_crm_contacts_owner_user_id ON crm_contacts(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_crm_organizations_owner_user_id ON crm_organizations(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_owner_user_id ON crm_deals(owner_user_id);

IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_interactions') THEN
  CREATE INDEX IF NOT EXISTS idx_crm_interactions_owner_user_id ON crm_interactions(owner_user_id);
END IF;

IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_tasks') THEN
  CREATE INDEX IF NOT EXISTS idx_crm_tasks_owner_user_id ON crm_tasks(owner_user_id);
END IF;

IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tb_nodes') THEN
  CREATE INDEX IF NOT EXISTS idx_tb_nodes_owner_user_id ON tb_nodes(owner_user_id);
END IF;

IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tb_edges') THEN
  CREATE INDEX IF NOT EXISTS idx_tb_edges_owner_user_id ON tb_edges(owner_user_id);
END IF;

IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tb_memory_fragments') THEN
  CREATE INDEX IF NOT EXISTS idx_tb_memory_fragments_owner_user_id ON tb_memory_fragments(owner_user_id);
END IF;

IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events_cache') THEN
  CREATE INDEX IF NOT EXISTS idx_calendar_events_cache_owner_user_id ON calendar_events_cache(owner_user_id);
END IF;

IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_threads') THEN
  CREATE INDEX IF NOT EXISTS idx_email_threads_owner_user_id ON email_threads(owner_user_id);
END IF;

