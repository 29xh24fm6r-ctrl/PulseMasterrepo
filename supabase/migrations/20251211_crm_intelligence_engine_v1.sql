-- CRM Intelligence Engine v1
-- supabase/migrations/20251211_crm_intelligence_engine_v1.sql

-- 1. Contacts
create table if not exists crm_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  full_name text not null,
  first_name text,
  last_name text,
  nickname text,
  primary_email text,
  primary_phone text,
  company_name text,
  title text,
  type text,                           -- 'personal', 'business', 'prospect', 'client', 'vendor', 'family', 'friend'
  tags text[] default '{}',            -- '{vip, sba, referral_source}'
  timezone text,
  relationship_importance int default 1, -- 1–5 subjective importance
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists crm_contacts_user_idx
  on crm_contacts(user_id, type);

create index if not exists crm_contacts_name_idx
  on crm_contacts(user_id, full_name);

-- 2. Organizations
create table if not exists crm_organizations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  industry text,
  website text,
  size text,                           -- 'solo', 'small', 'mid', 'enterprise'
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists crm_orgs_user_idx
  on crm_organizations(user_id, name);

-- 3. Contact-Organization Links
create table if not exists crm_contact_org_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  contact_id uuid not null references crm_contacts(id) on delete cascade,
  organization_id uuid not null references crm_organizations(id) on delete cascade,
  role text,                            -- 'owner', 'decision_maker', 'influencer', 'staff'
  created_at timestamptz default now(),
  unique (user_id, contact_id, organization_id)
);

create index if not exists crm_contact_org_links_contact_idx
  on crm_contact_org_links(contact_id);

create index if not exists crm_contact_org_links_org_idx
  on crm_contact_org_links(organization_id);

-- 4. Deals
create table if not exists crm_deals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,                    -- 'Hard AF Seltzer LOC', 'Dollar General CRE #3'
  stage text not null,                   -- 'lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'
  amount numeric(14,2),
  currency text default 'USD',
  close_date date,
  probability int default 0,             -- 0–100 (optional)
  source text,                           -- 'referral', 'inbound', 'outbound', etc.
  tags text[] default '{}',
  primary_contact_id uuid references crm_contacts(id) on delete set null,
  organization_id uuid references crm_organizations(id) on delete set null,
  pipeline text default 'default',       -- for multiple pipelines later
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists crm_deals_user_idx
  on crm_deals(user_id, stage);

create index if not exists crm_deals_close_idx
  on crm_deals(user_id, close_date);

-- 5. Deal Contacts (secondary contacts on deals)
create table if not exists crm_deal_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  deal_id uuid not null references crm_deals(id) on delete cascade,
  contact_id uuid not null references crm_contacts(id) on delete cascade,
  role text,                            -- 'economic_buyer', 'technical', 'influencer'
  created_at timestamptz default now(),
  unique (user_id, deal_id, contact_id)
);

create index if not exists crm_deal_contacts_deal_idx
  on crm_deal_contacts(deal_id);

create index if not exists crm_deal_contacts_contact_idx
  on crm_deal_contacts(contact_id);

-- 6. Interactions
create table if not exists crm_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  contact_id uuid references crm_contacts(id) on delete set null,
  deal_id uuid references crm_deals(id) on delete set null,
  type text not null,                   -- 'call', 'meeting', 'email', 'sms', 'note', 'other'
  channel text,                         -- 'phone', 'zoom', 'in_person', 'whatsapp', etc.
  occurred_at timestamptz not null,
  subject text,
  summary text,
  sentiment text,                       -- 'positive', 'neutral', 'negative' (optional v1)
  importance int default 1,             -- 1–5
  created_at timestamptz default now()
);

create index if not exists crm_interactions_user_idx
  on crm_interactions(user_id, occurred_at desc);

create index if not exists crm_interactions_contact_idx
  on crm_interactions(user_id, contact_id, occurred_at desc);

create index if not exists crm_interactions_deal_idx
  on crm_interactions(user_id, deal_id, occurred_at desc);

-- 7. Relationship Health
create table if not exists crm_relationship_health (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  contact_id uuid not null references crm_contacts(id) on delete cascade,
  score int not null,                   -- 0–100
  last_interaction_at timestamptz,
  next_suggested_checkin_at timestamptz,
  momentum text,                        -- 'improving', 'stable', 'declining'
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, contact_id)
);

create index if not exists crm_rel_health_user_idx
  on crm_relationship_health(user_id, score desc);

-- 8. Deal Health
create table if not exists crm_deal_health (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  deal_id uuid not null references crm_deals(id) on delete cascade,
  score int not null,                   -- 0–100, higher = healthier
  risk_level int not null,              -- 1–5
  last_interaction_at timestamptz,
  days_stalled int,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, deal_id)
);

create index if not exists crm_deal_health_user_idx
  on crm_deal_health(user_id, score desc);

-- 9. CRM Alerts
create table if not exists crm_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null,                   -- 'relationship_at_risk', 'deal_stalled', 'vip_neglect', 'positive_momentum'
  contact_id uuid references crm_contacts(id) on delete set null,
  deal_id uuid references crm_deals(id) on delete set null,
  title text not null,
  body text not null,
  severity int default 1,               -- 1–5
  is_positive boolean default false,
  created_at timestamptz default now(),
  seen_at timestamptz,
  dismissed_at timestamptz
);

create index if not exists crm_alerts_user_idx
  on crm_alerts(user_id, created_at desc);




