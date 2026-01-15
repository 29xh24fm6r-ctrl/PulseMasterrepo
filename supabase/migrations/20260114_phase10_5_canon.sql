-- Phase 10.5: Final Canon Verification (Lockdown)
-- Table: brain_canon_status

create table if not exists public.brain_canon_status (
    owner_user_id text not null,
    canon_version text not null,
    verified_at timestamptz not null default now(),
    verified_by text not null, -- 'script:verify-no-bypass' etc
    autonomy_eligible boolean not null default false,
    notes text,
    
    constraint brain_canon_status_pkey primary key (owner_user_id)
);

-- RLS
alter table public.brain_canon_status enable row level security;

-- Read-only for authenticated users (Pulse Brain reads this to unlock autonomy)
create policy "Users can view their own canon status"
    on public.brain_canon_status
    for select
    to authenticated
    using (auth.uid()::text = owner_user_id);

-- Only service role (admin) can update/insert via verification scripts
-- (No insert policy for authenticated users)
