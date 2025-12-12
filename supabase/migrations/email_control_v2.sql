-- Email Control OS
-- supabase/migrations/email_control_v2.sql

-- Email Threads (extends existing schema if present)
-- Note: If email_threads already exists from sync.ts, we'll add missing columns
create table if not exists public.email_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text,                   -- "gmail" | "outlook" (from sync.ts)
  thread_id text,                  -- external thread ID (from sync.ts)
  external_thread_id text,         -- alias for thread_id
  subject text,
  last_message_at timestamptz,
  last_message_from text,          -- from sync.ts
  last_from text,                  -- alias
  last_message_to text,             -- from sync.ts
  last_to text[],                   -- array version
  last_summary text,
  snippet text,                     -- from sync.ts
  importance text,                 -- "low" | "normal" | "high" | "critical"
  status text default 'open',      -- "open" | "snoozed" | "done"
  note_id uuid,                    -- link to third brain note
  created_at timestamptz default now()
);

-- Add missing columns if table already exists
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'email_threads' and column_name = 'status') then
    alter table public.email_threads add column status text default 'open';
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'email_threads' and column_name = 'note_id') then
    alter table public.email_threads add column note_id uuid;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'email_threads' and column_name = 'external_thread_id') then
    alter table public.email_threads add column external_thread_id text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'email_threads' and column_name = 'last_from') then
    alter table public.email_threads add column last_from text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'email_threads' and column_name = 'last_to') then
    alter table public.email_threads add column last_to text[];
  end if;
end $$;

create index if not exists email_threads_user_idx
  on public.email_threads (user_id, status, last_message_at desc);

create index if not exists email_threads_importance_idx
  on public.email_threads (user_id, importance);

-- Email Messages
create table if not exists public.email_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references email_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  external_message_id text,
  from_address text,
  to_addresses text[],
  cc_addresses text[],
  sent_at timestamptz,
  subject text,
  snippet text,
  body text,
  is_incoming boolean,             -- true if from other person
  is_read boolean default false,
  created_at timestamptz default now()
);

create index if not exists email_messages_thread_idx
  on public.email_messages (thread_id, sent_at desc);

create index if not exists email_messages_user_idx
  on public.email_messages (user_id, sent_at desc);

-- Email Tasks
create table if not exists public.email_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid references email_threads(id) on delete cascade,
  message_id uuid references email_messages(id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz,
  status text default 'open',      -- "open" | "in_progress" | "done" | "dismissed"
  priority text,                   -- "low" | "normal" | "high"
  created_at timestamptz default now()
);

create index if not exists email_tasks_user_status_idx
  on public.email_tasks (user_id, status, due_at);

create index if not exists email_tasks_priority_idx
  on public.email_tasks (user_id, priority, status);

-- Email Followups
create table if not exists public.email_followups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references email_threads(id) on delete cascade,
  last_message_id uuid references email_messages(id),
  last_from_you boolean,           -- whether last message in thread was sent by user
  response_due_at timestamptz,     -- when you "owe" a reply by
  status text default 'open',      -- "open" | "replied" | "cancelled"
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists email_followups_user_status_idx
  on public.email_followups (user_id, status, response_due_at);

create index if not exists email_followups_thread_idx
  on public.email_followups (thread_id, status);

