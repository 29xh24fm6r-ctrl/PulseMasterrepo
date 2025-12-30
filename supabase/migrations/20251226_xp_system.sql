-- XP Logs Table
create table if not exists public.xp_logs (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  amount integer not null default 0,
  category text not null, -- DXP, PXP, IXP, AXP, MXP
  activity text not null,
  source_type text,
  source_id text,
  notes text,
  was_crit boolean default false,
  base_amount integer,
  
  created_at timestamptz default now()
);

-- RLS
alter table public.xp_logs enable row level security;
create policy "Users can see own xp logs" on public.xp_logs for all using (user_id = auth.uid()::text);

-- Indexes
create index if not exists xp_logs_user_date_idx on public.xp_logs(user_id, created_at);
create index if not exists xp_logs_category_idx on public.xp_logs(category);
