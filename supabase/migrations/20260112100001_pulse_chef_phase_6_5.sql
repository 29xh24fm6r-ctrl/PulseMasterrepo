begin;

-- =========================
-- Notifications (in-app feed)
-- =========================
create table if not exists public.chef_notifications (
  id uuid primary key default gen_random_uuid(),
  owner_user_id text not null,

  type text not null, -- go_time | reminder | timer | info
  title text not null,
  body text,

  dedupe_key text not null,

  cook_plan_id uuid references public.chef_cook_plans(id) on delete cascade,
  execution_id uuid references public.chef_cook_executions(id) on delete set null,

  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists chef_notifications_owner_user_id_idx
  on public.chef_notifications (owner_user_id);

create index if not exists chef_notifications_created_at_idx
  on public.chef_notifications (created_at desc);

create unique index if not exists chef_notifications_owner_dedupe_uq
  on public.chef_notifications (owner_user_id, dedupe_key);

alter table public.chef_notifications enable row level security;

alter table public.chef_notifications
  add constraint chef_notifications_type_chk
  check (type in ('go_time','reminder','timer','info'));

-- =========================
-- Learning log (actual vs planned)
-- =========================
create table if not exists public.chef_cook_learning_events (
  id uuid primary key default gen_random_uuid(),
  owner_user_id text not null,
  cook_plan_id uuid not null references public.chef_cook_plans(id) on delete cascade,
  execution_id uuid references public.chef_cook_executions(id) on delete set null,

  planned_total_minutes integer not null,
  actual_total_minutes integer not null,

  planned_speed_modifier numeric not null,
  suggested_speed_modifier numeric not null,

  created_at timestamptz not null default now()
);

create index if not exists chef_cook_learning_events_owner_user_id_idx
  on public.chef_cook_learning_events (owner_user_id);

create index if not exists chef_cook_learning_events_created_at_idx
  on public.chef_cook_learning_events (created_at desc);

alter table public.chef_cook_learning_events enable row level security;

commit;
