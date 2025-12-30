-- Create deals table
create table if not exists public.deals (
  id uuid default gen_random_uuid() primary key,
  user_id text not null, -- Clerk ID
  title text not null,
  company text not null,
  value numeric default 0,
  stage text not null default 'Prospecting',
  close_date timestamptz,
  source text,
  notes text,
  industry text,
  company_size text,
  contact_name text,
  contact_email text,
  ai_insights text,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.deals enable row level security;

-- RLS Policy
create policy "Users can only see their own deals"
  on public.deals for all
  using ( user_id = auth.uid()::text );

-- Indexes
create index if not exists deals_user_id_idx on public.deals(user_id);
create index if not exists deals_stage_idx on public.deals(stage);
