-- Contact Intelligence Cockpit v1
-- Creates unified timeline, intelligence snapshot, and facts tables

-- 1. Contact Events (unified timeline backbone)
create table if not exists crm_contact_events (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null, -- Clerk user ID (string UUID)
  contact_id uuid not null references crm_contacts(id) on delete cascade,
  event_type text not null, -- 'email_in', 'email_out', 'call', 'meeting', 'note', 'task_created', 'task_done', 'followup_sent', 'doc_requested', etc.
  occurred_at timestamptz not null default now(),
  title text,
  body text, -- snippet/description
  source text, -- 'gmail', 'manual', 'calendar', 'system'
  source_id text, -- messageId/eventId/etc
  metadata jsonb default '{}', -- threadId, participants, duration, etc.
  created_at timestamptz default now()
);

create index if not exists idx_crm_contact_events_owner_contact_time 
  on crm_contact_events(owner_user_id, contact_id, occurred_at desc);
create index if not exists idx_crm_contact_events_owner_time 
  on crm_contact_events(owner_user_id, occurred_at desc);
create index if not exists idx_crm_contact_events_contact 
  on crm_contact_events(contact_id);
create index if not exists idx_crm_contact_events_type 
  on crm_contact_events(event_type);

-- 2. Contact Intelligence Snapshot (fast load, cached)
create table if not exists crm_contact_intel (
  contact_id uuid primary key references crm_contacts(id) on delete cascade,
  owner_user_id uuid not null, -- Clerk user ID
  relationship_score int default 50, -- 0-100
  relationship_trend_30d int default 0, -- -20 to +20 (improving = positive, declining = negative)
  last_touch_at timestamptz,
  last_touch_type text,
  next_touch_due_at timestamptz,
  open_loops_count int default 0,
  risk_flags jsonb default '[]', -- array of strings
  top_topics jsonb default '[]', -- array of strings
  key_facts jsonb default '[]', -- array of {fact, category, confidence}
  ai_summary text,
  suggested_next_actions jsonb default '[]', -- array of {action, reason, priority}
  updated_at timestamptz default now()
);

create index if not exists idx_crm_contact_intel_owner 
  on crm_contact_intel(owner_user_id, updated_at desc);
create index if not exists idx_crm_contact_intel_score 
  on crm_contact_intel(relationship_score desc);

-- 3. Contact Memory / Facts (human + AI)
create table if not exists crm_contact_facts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null, -- Clerk user ID
  contact_id uuid not null references crm_contacts(id) on delete cascade,
  fact text not null,
  category text, -- 'preference', 'family', 'business', 'objection', 'goal', 'value', 'boundary'
  confidence numeric default 0.5, -- 0-1
  source_event_id uuid references crm_contact_events(id) on delete set null,
  pinned boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_crm_contact_facts_contact 
  on crm_contact_facts(contact_id);
create index if not exists idx_crm_contact_facts_owner 
  on crm_contact_facts(owner_user_id);
create index if not exists idx_crm_contact_facts_pinned 
  on crm_contact_facts(contact_id, pinned) where pinned = true;
create index if not exists idx_crm_contact_facts_owner_contact_pinned 
  on crm_contact_facts(owner_user_id, contact_id, pinned desc, created_at desc);

-- RLS Policies (if using Supabase auth)
-- Note: If using Clerk, these will be enforced at application level
-- Uncomment if you have Supabase RLS enabled:
/*
alter table crm_contact_events enable row level security;
alter table crm_contact_intel enable row level security;
alter table crm_contact_facts enable row level security;

create policy "Users can only access their own contact events"
  on crm_contact_events for all
  using (owner_user_id::text = auth.uid()::text);

create policy "Users can only access their own contact intel"
  on crm_contact_intel for all
  using (owner_user_id::text = auth.uid()::text);

create policy "Users can only access their own contact facts"
  on crm_contact_facts for all
  using (owner_user_id::text = auth.uid()::text);
*/

-- Helper function to refresh intel snapshot (called by API)
create or replace function refresh_contact_intel(
  p_contact_id uuid,
  p_owner_user_id uuid
) returns void as $$
declare
  v_score int := 50;
  v_trend int := 0; -- -20 to +20
  v_last_touch timestamptz;
  v_last_touch_type text;
  v_next_touch timestamptz;
  v_open_loops int := 0;
  v_risk_flags jsonb := '[]';
  v_topics jsonb := '[]';
  v_facts jsonb := '[]';
begin
  -- Calculate relationship score (deterministic, no LLM needed)
  -- Recency: last touch age (0-30 points)
  select occurred_at, event_type into v_last_touch, v_last_touch_type
  from crm_contact_events
  where contact_id = p_contact_id and owner_user_id = p_owner_user_id
  order by occurred_at desc limit 1;
  
  if v_last_touch is not null then
    declare
      days_since int;
    begin
      days_since := extract(epoch from (now() - v_last_touch)) / 86400;
      if days_since <= 1 then
        v_score := v_score + 20;
      elsif days_since <= 7 then
        v_score := v_score + 15;
      elsif days_since <= 14 then
        v_score := v_score + 10;
      elsif days_since <= 30 then
        v_score := v_score + 5;
      else
        v_score := v_score - 10;
        v_risk_flags := v_risk_flags || jsonb_build_array('No touch in ' || days_since || ' days');
      end if;
    end;
  else
    v_risk_flags := v_risk_flags || jsonb_build_array('No interactions recorded');
  end if;
  
  -- Open loops: overdue tasks + unresponded emails (0-20 points)
  select count(*) into v_open_loops
  from crm_tasks
  where contact_id = p_contact_id 
    and owner_user_id = p_owner_user_id
    and status in ('pending', 'in_progress', 'open')
    and (due_at is null or due_at < now());
  
  if v_open_loops > 0 then
    v_score := v_score - (v_open_loops * 5);
    v_risk_flags := v_risk_flags || jsonb_build_array(v_open_loops || ' overdue tasks');
  end if;
  
  -- Calculate trend (simple: compare last 30d touch frequency to previous 30d)
  -- For now, set to 0 (stable) - can be enhanced later
  v_trend := 0;
  
  -- Clamp score to 0-100
  v_score := greatest(0, least(100, v_score));
  
  -- Next touch due: 14 days after last touch (or 7 if high priority)
  -- VIP/business: 7-14d, personal: 14-30d (simplified for now)
  if v_last_touch is not null then
    v_next_touch := v_last_touch + interval '14 days';
  else
    v_next_touch := now() + interval '7 days';
  end if;
  
  -- Update or insert intel snapshot
  insert into crm_contact_intel (
    contact_id, owner_user_id, relationship_score, relationship_trend_30d,
    last_touch_at, last_touch_type, next_touch_due_at, open_loops_count,
    risk_flags, top_topics, key_facts, updated_at
  ) values (
    p_contact_id, p_owner_user_id, v_score, v_trend,
    v_last_touch, v_last_touch_type, v_next_touch, v_open_loops,
    v_risk_flags, v_topics, v_facts, now()
  )
  on conflict (contact_id) do update set
    relationship_score = excluded.relationship_score,
    relationship_trend_30d = excluded.relationship_trend_30d,
    last_touch_at = excluded.last_touch_at,
    last_touch_type = excluded.last_touch_type,
    next_touch_due_at = excluded.next_touch_due_at,
    open_loops_count = excluded.open_loops_count,
    risk_flags = excluded.risk_flags,
    top_topics = excluded.top_topics,
    key_facts = excluded.key_facts,
    updated_at = excluded.updated_at;
end;
$$ language plpgsql;

