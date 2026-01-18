begin;

create table if not exists public.user_prefs (
  user_id text primary key,
  focus_mode_enabled boolean not null default false,
  active_focus_task_id uuid null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.user_prefs is 'Canonical per-user preferences for Pulse.';
comment on column public.user_prefs.active_focus_task_id is 'Task currently locked for Focus Mode.';
comment on column public.user_prefs.focus_mode_enabled is 'If true, UI restricts to active_focus_task_id.';

-- updated_at trigger (canonical pattern)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_user_prefs_updated_at on public.user_prefs;
create trigger trg_user_prefs_updated_at
before update on public.user_prefs
for each row execute function public.set_updated_at();

-- RLS
alter table public.user_prefs enable row level security;

drop policy if exists "user_prefs_select_own" on public.user_prefs;
create policy "user_prefs_select_own"
on public.user_prefs
for select
using (auth.uid()::text = user_id);

drop policy if exists "user_prefs_upsert_own" on public.user_prefs;
create policy "user_prefs_upsert_own"
on public.user_prefs
for insert
with check (auth.uid()::text = user_id);

drop policy if exists "user_prefs_update_own" on public.user_prefs;
create policy "user_prefs_update_own"
on public.user_prefs
for update
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

commit;
