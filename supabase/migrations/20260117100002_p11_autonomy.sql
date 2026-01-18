create table if not exists public.autonomy_scores (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  
  intent_type text not null,
  
  confidence_score float not null default 0.0,
  approval_count int not null default 0,
  rejection_count int not null default 0,
  
  autonomy_level text not null default 'l0'
    check (autonomy_level in ('none', 'l0', 'l1')),
    
  last_action_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.autonomy_scores enable row level security;

create policy "autonomy_scores_owner"
on public.autonomy_scores
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create unique index if not exists autonomy_scores_idx 
on public.autonomy_scores (owner_user_id, intent_type);
