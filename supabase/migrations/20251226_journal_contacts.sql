-- Journal Entries (Reflective, Mood, Tags)
create table if not exists public.journal_entries (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  title text not null,
  content text not null,
  mood text,
  tags text[], -- Array of strings
  xp_awarded integer default 0,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Contacts (Second Brain People)
create table if not exists public.contacts (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  name text not null,
  email text,
  phone text,
  company text,
  title text,
  industry text,
  relationship text default 'New Contact',
  notes text,
  linkedin_url text,
  ai_insights text,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table public.journal_entries enable row level security;
alter table public.contacts enable row level security;

create policy "Users can see own journal" on public.journal_entries for all using (user_id = auth.uid()::text);
create policy "Users can see own contacts" on public.contacts for all using (user_id = auth.uid()::text);

-- Indexes
create index if not exists journal_user_date_idx on public.journal_entries(user_id, created_at);
create index if not exists contacts_user_company_idx on public.contacts(user_id, company);
create index if not exists contacts_email_idx on public.contacts(user_id, email);
