-- CRM Canonical Identity System
-- Ensures one canonical active record per person per user
-- Prevents duplicates and handles merged contacts properly

-- A1) Unique active email constraint (prevents future dupes)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_crm_active_email_per_user
  ON crm_contacts (user_id, normalized_email)
  WHERE status = 'active' AND normalized_email IS NOT NULL AND normalized_email <> '';

-- Optional: Unique active phone constraint
CREATE UNIQUE INDEX IF NOT EXISTS uniq_crm_active_phone_per_user
  ON crm_contacts (user_id, normalized_phone)
  WHERE status = 'active' AND normalized_phone IS NOT NULL AND normalized_phone <> '';

-- A2) Canonical view for UI (People page + search)
CREATE OR REPLACE VIEW crm_people AS
  SELECT *
  FROM crm_contacts
  WHERE status = 'active';

-- A3) Ownership backfill (fix missing contacts)
-- Only update rows where owner_user_id is NULL and user_id exists
-- This ensures all contacts have owner_user_id for proper scoping
UPDATE crm_contacts
SET owner_user_id = (
  SELECT clerk_id FROM users WHERE users.id = crm_contacts.user_id LIMIT 1
)
WHERE owner_user_id IS NULL 
  AND user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM users WHERE users.id = crm_contacts.user_id);

-- If the above doesn't work (users.clerk_id not available), use a safer fallback:
-- Just set owner_user_id to a placeholder that indicates it needs manual review
-- Or set it based on your existing data patterns

-- Note: We're NOT adding NOT NULL constraint yet to avoid breaking existing rows
-- Once you've verified all rows have owner_user_id, you can add:
-- ALTER TABLE crm_contacts ALTER COLUMN owner_user_id SET NOT NULL;

