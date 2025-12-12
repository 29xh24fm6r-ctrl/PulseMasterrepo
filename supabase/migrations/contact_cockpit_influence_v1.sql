-- Contact Relationship Cockpit + Influence Engine v1
-- supabase/migrations/contact_cockpit_influence_v1.sql

-- Relationship Scores (if not exists)
create table if not exists public.contact_relationship_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  familiarity_score numeric, -- 0..1
  trust_score numeric, -- 0..1
  warmth_score numeric, -- 0..1
  influence_score numeric, -- 0..1
  power_balance_score numeric, -- -1..1 (negative = they have more power, positive = you have more)
  last_updated timestamptz default now(),
  unique(user_id, contact_id)
);

create index if not exists contact_relationship_scores_user_contact_idx
  on public.contact_relationship_scores (user_id, contact_id);

-- Identity Intel (if not exists)
create table if not exists public.contact_identity_intel (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  summarised_identity text,
  inferred_personality jsonb,
  inferred_values jsonb,
  inferred_drivers jsonb,
  inferred_communication_style jsonb,
  last_refreshed timestamptz default now(),
  unique(user_id, contact_id)
);

create index if not exists contact_identity_intel_user_contact_idx
  on public.contact_identity_intel (user_id, contact_id);

-- Influence Events (for learning)
create table if not exists public.contact_influence_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  suggestion_type text not null, -- 'next_best_action' | 'rewrite'
  context text,
  suggested_channel text,
  suggested_message text,
  suggested_summary text,
  rationale text,
  confidence numeric, -- 0..1
  model_metadata jsonb,
  user_action text, -- 'sent_as_is' | 'edited_and_sent' | 'ignored'
  user_feedback text,
  actual_outcome jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists contact_influence_events_user_contact_idx
  on public.contact_influence_events (user_id, contact_id, created_at desc);

