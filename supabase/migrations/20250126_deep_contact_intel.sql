-- Deep Contact Intelligence Engine
-- Adds external OSINT enrichment via Brave Search

-- 1. Intel Sources (raw discovered sources with match scoring)
create table if not exists crm_contact_intel_sources (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references crm_contacts(id) on delete cascade,
  owner_user_id uuid not null, -- Clerk user ID

  source_url text not null,
  source_domain text,
  source_type text not null, -- 'news' | 'podcast' | 'social' | 'profile' | 'org' | 'document' | 'blog'
  title text,
  snippet text,
  published_at timestamptz,

  query text,                -- which query found it
  brave_rank int,
  match_score int not null default 0,  -- 0-100
  match_evidence jsonb not null default '{}'::jsonb, -- why we believe it's the right person
  seen_at timestamptz not null default now(),

  unique(contact_id, source_url)
);

create index if not exists idx_intel_sources_contact 
  on crm_contact_intel_sources(contact_id, match_score desc);
create index if not exists idx_intel_sources_owner 
  on crm_contact_intel_sources(owner_user_id, seen_at desc);
create index if not exists idx_intel_sources_type 
  on crm_contact_intel_sources(source_type, match_score desc);

-- 2. Enhance crm_contact_intel with provenance
alter table crm_contact_intel
  add column if not exists source text default 'brave',
  add column if not exists source_url text,
  add column if not exists confidence int default 50,
  add column if not exists evidence jsonb default '{}'::jsonb,
  add column if not exists expires_at timestamptz;

-- 3. Add intel status to contacts
alter table crm_contacts
  add column if not exists intel_status text default 'idle', -- idle | running | paused | error
  add column if not exists last_intel_run_at timestamptz,
  add column if not exists next_intel_run_at timestamptz;

create index if not exists idx_contacts_intel_status 
  on crm_contacts(intel_status, last_intel_run_at desc);

