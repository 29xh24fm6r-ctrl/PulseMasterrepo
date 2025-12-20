-- 20251219_ops_automation_locks.sql
begin;

create table if not exists public.ops_automation_locks (
  key text primary key,              -- e.g. "rollback_auto_merge"
  enabled boolean not null default false,
  reason text null,
  updated_at timestamptz not null default now(),
  updated_by text null               -- optional (clerk user id / email later)
);

-- seed key used by rollback auto-merge guard
insert into public.ops_automation_locks (key, enabled, reason)
values ('rollback_auto_merge', false, null)
on conflict (key) do nothing;

create index if not exists ops_automation_locks_enabled_idx
  on public.ops_automation_locks (enabled);

-- RLS
alter table public.ops_automation_locks enable row level security;

drop policy if exists "ops_automation_locks_read_auth" on public.ops_automation_locks;
create policy "ops_automation_locks_read_auth"
on public.ops_automation_locks
for select
to authenticated
using (true);

-- No write policies: service role only (supabaseAdmin)

commit;

