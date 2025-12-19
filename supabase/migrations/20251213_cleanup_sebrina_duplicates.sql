-- One-time cleanup: Merge duplicate Sebrina contacts
-- This script merges 3 duplicate Sebrina records into the canonical one

-- F1) Choose canonical row (newest/most complete with owner set)
-- Canonical: af5d5694-f7e2-4274-b36a-a1176d429a83

-- F2) Mark others as merged
UPDATE crm_contacts
SET 
  status = 'merged',
  merged_into_contact_id = 'af5d5694-f7e2-4274-b36a-a1176d429a83',
  updated_at = NOW()
WHERE id IN (
  '047ff2e4-836c-40a1-90ae-66c9a5608f92',
  'dc1fbb7e-cf29-4387-8444-2249f1d6e480',
  'ee6e6043-303f-4bf7-b938-f806f1bf5dc7'
);

-- F3) Ensure canonical has owner_user_id set
UPDATE crm_contacts
SET owner_user_id = COALESCE(owner_user_id, 'user_36NzFTiYlRlzKxEfTw2FXrnVJNe')
WHERE id = 'af5d5694-f7e2-4274-b36a-a1176d429a83';

-- Note: If you need to backfill owner_user_id for ALL contacts with NULL, use:
-- UPDATE crm_contacts
-- SET owner_user_id = (
--   SELECT clerk_id FROM users WHERE users.id = crm_contacts.user_id LIMIT 1
-- )
-- WHERE owner_user_id IS NULL AND user_id IS NOT NULL;

