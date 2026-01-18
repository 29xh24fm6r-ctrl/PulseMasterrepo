create table if not exists public.pulse_consents (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,

  consent_type text not null, -- e.g. "REMINDER_ASSIST", "NAV_ASSIST"
  scope jsonb not null default '{}'::jsonb,

  granted boolean not null default false,
  granted_at timestamptz,
  revoked_at timestamptz,

  created_at timestamptz not null default now()
);

alter table public.pulse_consents enable row level security;

create policy "pulse_consents_owner"
on public.pulse_consents
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());
