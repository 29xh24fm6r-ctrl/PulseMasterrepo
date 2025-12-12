-- Email Command & Control v3
-- supabase/migrations/email_ecc_v3.sql

-- Email Responsibilities
create table if not exists public.email_responsibilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid references email_threads(id) on delete cascade,
  message_id uuid references email_messages(id) on delete cascade,
  responsibility_type text not null,     -- 'action_request' | 'deliverable' | 'decision' | 'information' | 'risk' | 'opportunity'
  required_action text not null,         -- short human-readable description
  due_at timestamptz,                    -- explicit or inferred
  entity_ref text,                       -- e.g. 'Deal:DG-123', 'Client:Tom', etc. (optional, populated by Second/Third brain later)
  urgency text,                          -- 'low' | 'normal' | 'high' | 'critical'
  confidence numeric,                    -- 0..1
  status text default 'open',            -- 'open' | 'handled' | 'dismissed'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists email_responsibilities_user_status_idx
  on public.email_responsibilities (user_id, status, due_at);

create index if not exists email_responsibilities_thread_idx
  on public.email_responsibilities (thread_id, status);

-- Email Promises
create table if not exists public.email_promises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid references email_threads(id) on delete cascade,
  message_id uuid references email_messages(id) on delete cascade,
  promise_text text not null,            -- detected promise phrase
  promise_due_at timestamptz,            -- explicit or inferred
  confidence numeric,                    -- 0..1
  status text default 'open',            -- 'open' | 'kept' | 'broken' | 'dismissed'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists email_promises_user_status_idx
  on public.email_promises (user_id, status, promise_due_at);

create index if not exists email_promises_thread_idx
  on public.email_promises (thread_id, status);

-- Enhance email_tasks
alter table public.email_tasks
  add column if not exists confidence numeric,
  add column if not exists auto_created boolean default false,
  add column if not exists user_feedback text;  -- 'accepted' | 'rejected' | null

-- Add attention hint to email_threads
alter table public.email_threads
  add column if not exists attention_hint numeric; -- 0..1 rough importance for quick filtering

-- User Email Settings
create table if not exists public.user_email_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  task_mode text default 'manual',        -- 'manual' | 'assistive' | 'auto'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

