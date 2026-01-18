-- Tasks Schema Standardization
-- We want: title, description, status, priority, due_at, completed_at, user_id

create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  title text,
  name text, -- legacy support, we will migrate to title
  description text,
  status text default 'pending', -- pending, active, done, blocked
  priority text default 'medium',
  due_at timestamptz,
  due_date timestamptz, -- legacy
  completed_at timestamptz,
  context text,
  source text,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table public.tasks enable row level security;
create policy "Users can see own tasks" on public.tasks for all using (user_id = auth.uid()::text);

-- Migration trigger function to sync name/title if needed could go here, 
-- but for now we'll handle it in the application layer or just expect 'title'.
-- Adding indexes
create index if not exists tasks_user_status_idx on public.tasks(user_id, status);
