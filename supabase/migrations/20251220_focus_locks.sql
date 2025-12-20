-- 20251220_focus_locks.sql
begin;

create table if not exists public.focus_locks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  status text not null default 'active', -- active | ended | expired
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  minutes int not null,
  playbook_title text,
  playbook_do text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists focus_locks_user_status_idx
  on public.focus_locks (user_id, status);

create index if not exists focus_locks_user_ends_at_idx
  on public.focus_locks (user_id, ends_at desc);

commit;

