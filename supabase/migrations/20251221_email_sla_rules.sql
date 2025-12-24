-- Phase 3: SLA escalation rules
begin;

create table if not exists public.email_sla_rules (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  applies_to text not null check (applies_to in ('needs_reply', 'request', 'task', 'waiting_on_them')),
  warn_after interval not null,
  urgent_after interval not null,
  auto_follow_up boolean not null default false,
  created_at timestamptz not null default now()
);

-- Seed default SLA rule
insert into public.email_sla_rules (label, applies_to, warn_after, urgent_after, auto_follow_up)
values ('Reply SLA', 'needs_reply', interval '4 hours', interval '24 hours', true)
on conflict do nothing;

create index if not exists email_sla_rules_applies_to_idx on public.email_sla_rules (applies_to);

commit;

