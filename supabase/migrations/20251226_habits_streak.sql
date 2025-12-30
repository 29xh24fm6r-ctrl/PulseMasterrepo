alter table public.habits 
add column if not exists streak integer default 0,
add column if not exists last_completed_at timestamptz;
