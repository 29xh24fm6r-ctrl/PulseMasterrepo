create table execution_confirmations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  intent_type text not null,
  confirmed_at timestamptz not null,
  source text not null, -- voice | ui
  trust_level text not null
);

-- RLS
alter table execution_confirmations enable row level security;

-- Policies
create policy pulse_user_owns_row on execution_confirmations
  for all
  using (auth.uid() = user_id);

-- Grants
grant all on execution_confirmations to service_role;
grant all on execution_confirmations to postgres;
grant select, insert on execution_confirmations to authenticated;
