-- Add unique constraints for deduplication
-- Run AFTER dedupe script has been run and duplicates merged
-- supabase/migrations/003_add_dedupe_constraints.sql

-- Note: This will fail if duplicates still exist
-- Run scripts/dedupe-contacts.sql first to identify duplicates
-- Then merge them manually or run the merge script

-- Unique constraint on email per user (where email is not null)
-- This prevents duplicate contacts with the same email for the same user
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_contacts_email_unique
ON crm_contacts(owner_user_id, LOWER(primary_email))
WHERE primary_email IS NOT NULL AND primary_email != '';

-- Unique constraint on domain per user (where domain is not null)
-- This prevents duplicate organizations with the same domain for the same user
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_organizations_domain_unique
ON crm_organizations(owner_user_id, domain)
WHERE domain IS NOT NULL AND domain != '';

-- Add unique constraint on (owner_user_id, source_type, source_id) for interactions
-- Prevents duplicate interactions from same source
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_interactions_source_unique
ON crm_interactions(owner_user_id, (metadata->>'source_type'), (metadata->>'source_id'))
WHERE metadata->>'source_type' IS NOT NULL AND metadata->>'source_id' IS NOT NULL;

-- Add comment explaining the constraints
COMMENT ON INDEX idx_crm_contacts_email_unique IS 
'Ensures one contact per email per user. Prevents duplicate contacts.';
COMMENT ON INDEX idx_crm_organizations_domain_unique IS 
'Ensures one organization per domain per user. Prevents duplicate organizations.';
COMMENT ON INDEX idx_crm_interactions_source_unique IS 
'Prevents duplicate interactions from same source (e.g., same email thread, same calendar event).';

