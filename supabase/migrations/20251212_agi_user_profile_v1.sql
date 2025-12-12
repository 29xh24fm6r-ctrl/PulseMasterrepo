-- AGI User Profile - Personalization Layer
-- supabase/migrations/20251212_agi_user_profile_v1.sql

create table if not exists public.agi_user_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,

  -- What domains matter to this user
  -- Example: { "work": true, "relationships": false, "finance": true, "health": false }
  priorities jsonb not null default '{}'::jsonb,

  -- What AGI is allowed to do
  -- Example: { "create_tasks": true, "reorder_tasks": true, "calendar_blocks": false, "draft_emails": false }
  capabilities jsonb not null default '{}'::jsonb,

  -- Overall autonomy style
  -- 'conservative' | 'balanced' | 'proactive'
  autonomy_style text not null default 'balanced',

  -- User's preferred AGI rituals (morning/midday/evening/weekly)
  -- Example: { "morning": { "enabled": true, "time": "08:00", "focus": ["work","relationships"] }, ... }
  rituals jsonb not null default '{}'::jsonb,

  -- High-level areas they care about
  focus_areas text[] default array[]::text[],

  -- Preferred AGI voice/persona
  -- 'default' | 'calm' | 'hype' | 'stoic' | 'strategist'
  tone text not null default 'default',

  -- When & how they want to be notified
  -- Example: { "in_app": true, "email": false, "sms": false }
  notification_preferences jsonb not null default '{}'::jsonb,

  -- Whether they want predictive, forward-looking suggestions
  predictive_assistance boolean not null default true,

  -- Hard off-limits rules
  -- Example: { "no_email_send": true, "no_calendar_changes": true }
  hard_limits jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agi_user_profile_tone_idx
  on public.agi_user_profile(tone);

-- RLS policies
alter table public.agi_user_profile enable row level security;

create policy "Users can view their own AGI profile"
  on public.agi_user_profile
  for select
  using (auth.uid() = user_id);

create policy "Users can update their own AGI profile"
  on public.agi_user_profile
  for update
  using (auth.uid() = user_id);

create policy "Users can insert their own AGI profile"
  on public.agi_user_profile
  for insert
  with check (auth.uid() = user_id);



