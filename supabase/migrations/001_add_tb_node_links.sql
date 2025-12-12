-- Migration: Add tb_node_id links to CRM tables
-- This connects CRM entities to Second Brain nodes

-- Add tb_node_id to crm_contacts
ALTER TABLE crm_contacts
ADD COLUMN IF NOT EXISTS tb_node_id UUID NULL;

CREATE INDEX IF NOT EXISTS idx_crm_contacts_tb_node_id 
ON crm_contacts(tb_node_id) 
WHERE tb_node_id IS NOT NULL;

-- Add tb_node_id to crm_organizations
ALTER TABLE crm_organizations
ADD COLUMN IF NOT EXISTS tb_node_id UUID NULL;

CREATE INDEX IF NOT EXISTS idx_crm_organizations_tb_node_id 
ON crm_organizations(tb_node_id) 
WHERE tb_node_id IS NOT NULL;

-- Add tb_node_id to crm_deals
ALTER TABLE crm_deals
ADD COLUMN IF NOT EXISTS tb_node_id UUID NULL;

CREATE INDEX IF NOT EXISTS idx_crm_deals_tb_node_id 
ON crm_deals(tb_node_id) 
WHERE tb_node_id IS NOT NULL;

-- Add intel_summary field for Intelligence layer derived summaries
ALTER TABLE crm_contacts
ADD COLUMN IF NOT EXISTS intel_summary TEXT NULL;

ALTER TABLE crm_organizations
ADD COLUMN IF NOT EXISTS intel_summary TEXT NULL;

-- Add domain field to organizations for deduplication
ALTER TABLE crm_organizations
ADD COLUMN IF NOT EXISTS domain TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_organizations_domain 
ON crm_organizations(owner_user_id, domain) 
WHERE domain IS NOT NULL;

-- Add indexes for deduplication (will add unique constraints after dedupe script)
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email_lookup 
ON crm_contacts(owner_user_id, LOWER(primary_email)) 
WHERE primary_email IS NOT NULL;

