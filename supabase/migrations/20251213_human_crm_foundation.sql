-- Human CRM Foundation v1
-- supabase/migrations/20251213_human_crm_foundation.sql

-- Extend crm_contacts if needed (add missing columns)
alter table if exists crm_contacts
  add column if not exists display_name text,
  add column if not exists job_title text,
  add column if not exists status text default 'active';

-- 1. Tag system (user-defined, multi-select)
create table if not exists contact_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  category text,
  color text,
  created_at timestamptz not null default now(),
  unique(user_id, name)
);

create index if not exists idx_contact_tags_user on contact_tags(user_id);
create index if not exists idx_contact_tags_category on contact_tags(user_id, category);

create table if not exists contact_tag_links (
  user_id uuid not null,
  contact_id uuid not null references crm_contacts(id) on delete cascade,
  tag_id uuid not null references contact_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (contact_id, tag_id)
);

create index if not exists idx_contact_tag_links_user on contact_tag_links(user_id);
create index if not exists idx_contact_tag_links_contact on contact_tag_links(contact_id);
create index if not exists idx_contact_tag_links_tag on contact_tag_links(tag_id);

-- 2. Multiple emails/phones (optional but recommended)
create table if not exists contact_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  contact_id uuid not null references crm_contacts(id) on delete cascade,
  email text not null,
  label text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_contact_emails_contact on contact_emails(contact_id);
create index if not exists idx_contact_emails_user on contact_emails(user_id);
create index if not exists idx_contact_emails_email on contact_emails(email);

create table if not exists contact_phones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  contact_id uuid not null references crm_contacts(id) on delete cascade,
  phone text not null,
  label text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_contact_phones_contact on contact_phones(contact_id);
create index if not exists idx_contact_phones_user on contact_phones(user_id);

-- 3. Household / relationship graph
create table if not exists contact_relationships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  from_contact_id uuid not null references crm_contacts(id) on delete cascade,
  to_contact_id uuid not null references crm_contacts(id) on delete cascade,
  relation text not null, -- spouse, partner, child, parent, coworker, vendor_for, etc.
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_contact_relationships_user on contact_relationships(user_id);
create index if not exists idx_contact_relationships_from on contact_relationships(from_contact_id);
create index if not exists idx_contact_relationships_to on contact_relationships(to_contact_id);

-- 4. Facts with provenance + confidence (core intelligence)
create table if not exists contact_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  contact_id uuid not null references crm_contacts(id) on delete cascade,
  key text not null, -- birthday, favorite_color, spouse_name, kids_names, etc.
  value_text text,
  value_json jsonb,
  value_date date,
  confidence numeric not null default 1.0,
  source text not null default 'manual', -- manual|email|call|meeting|sms|import
  source_ref text,
  last_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contact_facts_user on contact_facts(user_id);
create index if not exists idx_contact_facts_contact on contact_facts(contact_id);
create index if not exists idx_contact_facts_key on contact_facts(key);

-- 5. Important dates
create table if not exists contact_dates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  contact_id uuid not null references crm_contacts(id) on delete cascade,
  type text not null, -- birthday, anniversary, renewal, etc.
  date date not null,
  recurrence text, -- yearly, none
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_contact_dates_user on contact_dates(user_id);
create index if not exists idx_contact_dates_contact on contact_dates(contact_id);
create index if not exists idx_contact_dates_date on contact_dates(date);

-- 6. Gift ideas + history
create table if not exists gift_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  contact_id uuid not null references crm_contacts(id) on delete cascade,
  occasion text, -- christmas, birthday, anniversary
  idea text not null,
  price_range text,
  why text,
  status text not null default 'idea', -- idea|bought|given
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gift_ideas_user on gift_ideas(user_id);
create index if not exists idx_gift_ideas_contact on gift_ideas(contact_id);
create index if not exists idx_gift_ideas_status on gift_ideas(status);

-- 7. Unified interaction timeline (second brain bridge)
create table if not exists interaction_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  contact_id uuid references crm_contacts(id) on delete set null,
  type text not null, -- note|call|sms|email|meeting|task|deal|gift
  summary text not null,
  occurred_at timestamptz not null default now(),
  payload_ref jsonb, -- pointer to underlying record (table/id)
  extracted_fact_ids uuid[] default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_interaction_events_user on interaction_events(user_id);
create index if not exists idx_interaction_events_contact on interaction_events(contact_id);
create index if not exists idx_interaction_events_occurred on interaction_events(occurred_at desc);
create index if not exists idx_interaction_events_type on interaction_events(type);

