-- Contact Duplicate Prevention + Merge System
-- supabase/migrations/20251213_contact_dedup.sql

-- ============================================
-- 1. ADD NORMALIZATION COLUMNS TO CRM_CONTACTS
-- ============================================

alter table crm_contacts
  add column if not exists normalized_full_name text,
  add column if not exists normalized_email text,
  add column if not exists normalized_phone text,
  add column if not exists status text default 'active',  -- active|merged|archived
  add column if not exists merged_into_contact_id uuid;

-- ============================================
-- 2. BACKFILL EXISTING ROWS (Safe Best-Effort)
-- ============================================

update crm_contacts
set
  normalized_full_name = lower(regexp_replace(coalesce(full_name,''), '\s+', ' ', 'g')),
  normalized_email = lower(trim(coalesce(primary_email,''))),
  normalized_phone = regexp_replace(coalesce(primary_phone,''), '\D', '', 'g')
where
  normalized_full_name is null
  or normalized_email is null
  or normalized_phone is null;

-- ============================================
-- 3. INDEXES FOR FAST LOOKUPS
-- ============================================

create index if not exists idx_contacts_user_norm_email
  on crm_contacts(user_id, normalized_email)
  where normalized_email is not null and normalized_email <> '';

create index if not exists idx_contacts_user_norm_phone
  on crm_contacts(user_id, normalized_phone)
  where normalized_phone is not null and normalized_phone <> '';

create index if not exists idx_contacts_user_norm_name
  on crm_contacts(user_id, normalized_full_name)
  where normalized_full_name is not null and normalized_full_name <> '';

create index if not exists idx_contacts_status
  on crm_contacts(user_id, status)
  where status != 'active';

-- Optional: Partial uniqueness for email (enable later after testing)
-- create unique index if not exists uniq_contacts_user_email
--   on crm_contacts(user_id, normalized_email)
--   where normalized_email is not null and normalized_email <> '' and status = 'active';

-- ============================================
-- 4. MERGE AUDIT LOG TABLE
-- ============================================

create table if not exists crm_contact_merges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  winner_contact_id uuid not null references crm_contacts(id) on delete restrict,
  loser_contact_id uuid not null references crm_contacts(id) on delete restrict,
  merge_reason text,
  merge_plan jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_contact_merges_user 
  on crm_contact_merges(user_id);

create index if not exists idx_contact_merges_winner 
  on crm_contact_merges(winner_contact_id);

create index if not exists idx_contact_merges_loser 
  on crm_contact_merges(loser_contact_id);

-- ============================================
-- 5. DUPLICATE SUGGESTIONS TABLE (Optional Scanner)
-- ============================================

create table if not exists crm_contact_duplicate_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  a_contact_id uuid not null references crm_contacts(id) on delete cascade,
  b_contact_id uuid not null references crm_contacts(id) on delete cascade,
  score int not null,
  reasons jsonb default '[]'::jsonb,
  status text not null default 'open',  -- open|dismissed|merged
  created_at timestamptz not null default now(),
  unique(user_id, a_contact_id, b_contact_id)
);

create index if not exists idx_duplicate_suggestions_user_status
  on crm_contact_duplicate_suggestions(user_id, status);

create index if not exists idx_duplicate_suggestions_score
  on crm_contact_duplicate_suggestions(score desc);

