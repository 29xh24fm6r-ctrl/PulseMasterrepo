-- Habits definitions
create table if not exists public.habits (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  name text not null,
  xp_reward integer default 10,
  category text,
  frequency text default 'daily',
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Habit logs (completions)
create table if not exists public.habit_logs (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  habit_id uuid references public.habits(id) on delete cascade,
  completed_at timestamptz default now(),
  xp_awarded integer default 0,
  notes text
);

-- RLS
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

create policy "Users can see own habits" on public.habits for all using (user_id = auth.uid()::text);
create policy "Users can see own logs" on public.habit_logs for all using (user_id = auth.uid()::text);

-- Indexes
create index if not exists habit_logs_user_date_idx on public.habit_logs(user_id, completed_at);
