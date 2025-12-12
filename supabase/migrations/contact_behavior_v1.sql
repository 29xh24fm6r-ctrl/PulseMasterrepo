-- Contact Behavior Playbook v1
-- supabase/migrations/contact_behavior_v1.sql

-- Aggregate behavior per contact
create table if not exists public.contact_behavior_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,

  -- Core metrics
  emails_sent int default 0,
  emails_received int default 0,
  sms_sent int default 0,
  sms_received int default 0,
  calls_count int default 0,
  audio_conversations_count int default 0,

  avg_response_minutes numeric,         -- your average reply time to them
  their_avg_response_minutes numeric,   -- their average reply time to you

  prefers_channel text,                 -- 'email' | 'sms' | 'call' | 'mixed'
  escalation_channel text,              -- best channel when urgent

  conflict_sensitivity numeric,         -- 0..1
  brevity_preference numeric,           -- 0..1 (0 = long detail, 1 = short & punchy)
  formality_preference numeric,         -- 0..1
  directness_preference numeric,        -- 0..1

  reliability_score numeric,            -- 0..1 (do they keep promises?)
  risk_score numeric,                   -- 0..1 (relationship friction/volatility)

  last_updated timestamptz default now(),

  unique(user_id, contact_id)
);

create index if not exists contact_behavior_profiles_user_contact_idx
  on public.contact_behavior_profiles (user_id, contact_id);

-- Raw interaction events used to compute behavior
create table if not exists public.contact_interaction_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  comm_message_id uuid references comm_messages(id),
  channel_type text not null,                    -- 'email' | 'sms' | 'call' | 'audio'
  direction text not null,                       -- 'incoming' | 'outgoing'
  occurred_at timestamptz not null,
  sentiment numeric,                             -- -1..1
  emotion_label text,                            -- 'calm' | 'stressed' | 'angry' | 'excited' | etc.
  contains_promise boolean default false,
  contains_conflict boolean default false,
  response_time_minutes numeric,                 -- if this is a reply
  created_at timestamptz default now()
);

create index if not exists contact_interaction_events_user_contact_idx
  on public.contact_interaction_events (user_id, contact_id, occurred_at desc);

create index if not exists contact_interaction_events_contact_occurred_idx
  on public.contact_interaction_events (contact_id, occurred_at desc);

-- Cached playbooks (regenerated periodically)
create table if not exists public.contact_playbooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  summary text,
  do_list text[],
  dont_list text[],
  channel_guidelines text,
  tone_guidelines text,
  conflict_strategy text,
  persuasion_levers text,
  generated_at timestamptz default now(),

  unique(user_id, contact_id)
);

create index if not exists contact_playbooks_user_contact_idx
  on public.contact_playbooks (user_id, contact_id);

