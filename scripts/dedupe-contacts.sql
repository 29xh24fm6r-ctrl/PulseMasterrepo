-- Deduplication script for contacts and organizations
-- Run this BEFORE adding unique constraints to identify duplicates
-- supabase/migrations/002_dedupe_contacts.sql

-- Find duplicate contacts by email (same owner_user_id)
SELECT 
  owner_user_id,
  LOWER(primary_email) as email,
  COUNT(*) as duplicate_count,
  array_agg(id ORDER BY created_at) as contact_ids,
  array_agg(full_name ORDER BY created_at) as names,
  array_agg(created_at ORDER BY created_at) as created_dates
FROM crm_contacts
WHERE primary_email IS NOT NULL 
  AND primary_email != ''
  AND owner_user_id IS NOT NULL
GROUP BY owner_user_id, LOWER(primary_email)
HAVING COUNT(*) > 1;

-- Find duplicate organizations by domain
SELECT 
  owner_user_id,
  domain,
  COUNT(*) as duplicate_count,
  array_agg(id ORDER BY created_at) as org_ids,
  array_agg(name ORDER BY created_at) as names
FROM crm_organizations
WHERE domain IS NOT NULL 
  AND domain != ''
  AND owner_user_id IS NOT NULL
GROUP BY owner_user_id, domain
HAVING COUNT(*) > 1;

-- Manual review recommended before running merge script
-- The merge script will:
-- 1. Keep the oldest record (by created_at)
-- 2. Merge data from duplicates into the primary record
-- 3. Update all foreign key references
-- 4. Delete duplicate records

