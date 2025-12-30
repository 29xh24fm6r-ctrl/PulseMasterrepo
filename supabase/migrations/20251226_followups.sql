-- Follow Ups Table
create table if not exists public.follow_ups (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  name text,
  status text default 'pending', -- pending, sent, responded, cancelled
  priority text default 'medium',
  due_date timestamptz,
  type text default 'general', -- call, email, meeting
  person_name text, -- or link to contact_id if we want strictly relational, but text for flexibility
  contact_id uuid references public.contacts(id),
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table public.follow_ups enable row level security;
create policy "Users can see own follow ups" on public.follow_ups for all using (user_id = auth.uid()::text);

-- Indexes
create index if not exists follow_ups_user_due_idx on public.follow_ups(user_id, due_date);
