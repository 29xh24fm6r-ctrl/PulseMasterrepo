-- Universal Contact Intelligence System
-- supabase/migrations/20251213_universal_contact_intel.sql

-- ============================================
-- 1. ADD COLUMNS TO CRM_CONTACTS
-- ============================================

alter table crm_contacts
  add column if not exists intel_scope text not null default 'full',      -- full|limited|paused
  add column if not exists action_scope text not null default 'none',     -- none|suggest|automate
  add column if not exists industry text,
  add column if not exists keywords jsonb default '[]'::jsonb;            -- ["CRE","rates","construction"]

-- Note: company_name and job_title already exist in crm_contacts

-- ============================================
-- 2. CONTACT IDENTITY CARD (Entity Resolution Anchors)
-- ============================================

create table if not exists crm_contact_identity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  contact_id uuid not null references crm_contacts(id) on delete cascade,
  company_domain text,
  location text,
  known_social_urls jsonb default '[]'::jsonb,  -- ["https://linkedin.com/in/...", "https://twitter.com/..."]
  known_handles jsonb default '[]'::jsonb,      -- ["@handle", "username"]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, contact_id)
);

create index if not exists idx_contact_identity_user_contact 
  on crm_contact_identity(user_id, contact_id);

-- ============================================
-- 3. INTEL SOURCES (URLs / Pages / Mentions)
-- ============================================

create table if not exists crm_contact_intel_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  contact_id uuid not null references crm_contacts(id) on delete cascade,
  source_type text not null,              -- news|podcast|blog|profile|video|company|registry|user_added
  url text not null,
  title text,
  publisher text,
  author text,
  published_at timestamptz,
  snippet text,
  extracted_text text,                    -- Bounded length (e.g., max 20k chars)
  retrieved_at timestamptz not null default now(),
  match_confidence int not null default 0, -- 0-100
  match_status text not null default 'uncertain', -- verified|likely|uncertain|rejected
  match_evidence jsonb default '{}'::jsonb, -- { matched: ["company","title"], conflicts: [], excerpts: [...] }
  created_at timestamptz not null default now()
);

create index if not exists idx_intel_sources_user_contact 
  on crm_contact_intel_sources(user_id, contact_id);

create index if not exists idx_intel_sources_match 
  on crm_contact_intel_sources(match_status, match_confidence desc);

create unique index if not exists idx_intel_sources_unique_url_per_contact
  on crm_contact_intel_sources(user_id, contact_id, url);

-- ============================================
-- 4. INTEL CLAIMS (Facts-with-Citations)
-- ============================================

create table if not exists crm_contact_intel_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  contact_id uuid not null references crm_contacts(id) on delete cascade,
  category text not null,                 -- identity|interest|family|career|event|preference|communication|other
  claim text not null,
  source_url text not null,
  confidence int not null default 50,     -- 0-100
  status text not null default 'active',  -- active|superseded|rejected
  created_at timestamptz not null default now()
);

create index if not exists idx_intel_claims_user_contact 
  on crm_contact_intel_claims(user_id, contact_id);

create index if not exists idx_intel_claims_category 
  on crm_contact_intel_claims(category);

create index if not exists idx_intel_claims_status 
  on crm_contact_intel_claims(status);

-- ============================================
-- 5. INTEL RUNS (Audit + Throttling)
-- ============================================

create table if not exists crm_intel_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  contact_id uuid not null references crm_contacts(id) on delete cascade,
  run_type text not null,                 -- manual|scheduled|on_create|on_update|user_added
  queries jsonb default '[]'::jsonb,      -- ["First Last Company", "First Last podcast", ...]
  results_count int default 0,
  errors jsonb default '[]'::jsonb,       -- [{ error: "...", query: "..." }]
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists idx_intel_runs_user_contact 
  on crm_intel_runs(user_id, contact_id);

create index if not exists idx_intel_runs_type 
  on crm_intel_runs(run_type);

create index if not exists idx_intel_runs_started 
  on crm_intel_runs(started_at desc);
