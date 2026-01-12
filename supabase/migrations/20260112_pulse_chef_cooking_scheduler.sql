begin;

-- =========================
-- chef_cook_plans (soft blocks)
-- =========================
create table if not exists public.chef_cook_plans (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,

  -- Link to recipe (optional; V1 can schedule even without recipes)
  recipe_id uuid references public.chef_recipes(id) on delete set null,

  title text not null,

  -- Desired eat time and computed start time
  target_eat_at timestamptz not null,
  start_cook_at timestamptz not null,

  -- Time model
  prep_minutes integer not null default 0,
  cook_minutes integer not null default 0,
  buffer_minutes integer not null default 5,
  user_speed_modifier numeric not null default 1.0, -- 1.0 baseline

  -- State
  status text not null default 'scheduled', -- scheduled|started|completed|cancelled|missed|rescheduled
  last_recomputed_at timestamptz,

  -- Optional metadata (future: calendar sync IDs, reasons, etc.)
  meta jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chef_cook_plans_owner_user_id_idx
  on public.chef_cook_plans (owner_user_id);

create index if not exists chef_cook_plans_start_cook_at_idx
  on public.chef_cook_plans (start_cook_at);

create index if not exists chef_cook_plans_target_eat_at_idx
  on public.chef_cook_plans (target_eat_at);

alter table public.chef_cook_plans enable row level security;

-- Policy: Users own their plans
create policy "Users can manage their own cook plans"
  on public.chef_cook_plans for all
  using (auth.uid() = owner_user_id);

alter table public.chef_cook_plans
  add constraint chef_cook_plans_status_chk
  check (status in ('scheduled','started','completed','cancelled','missed','rescheduled'));

alter table public.chef_cook_plans
  add constraint chef_cook_plans_minutes_chk
  check (
    prep_minutes >= 0 and prep_minutes <= 1440
    and cook_minutes >= 0 and cook_minutes <= 1440
    and buffer_minutes >= 0 and buffer_minutes <= 240
  );

alter table public.chef_cook_plans
  add constraint chef_cook_plans_speed_modifier_chk
  check (user_speed_modifier > 0 and user_speed_modifier <= 3);

-- updated_at trigger
create or replace function public._set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at_on_chef_cook_plans on public.chef_cook_plans;
create trigger set_updated_at_on_chef_cook_plans
before update on public.chef_cook_plans
for each row execute procedure public._set_updated_at();

-- =========================
-- chef_cook_executions (runtime execution tracking)
-- =========================
create table if not exists public.chef_cook_executions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  cook_plan_id uuid not null references public.chef_cook_plans(id) on delete cascade,

  started_at timestamptz not null default now(),
  finished_at timestamptz,

  current_step integer not null default 0,
  timers jsonb not null default '[]'::jsonb, -- array of timers
  state jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists chef_cook_executions_owner_user_id_idx
  on public.chef_cook_executions (owner_user_id);

create index if not exists chef_cook_executions_cook_plan_id_idx
  on public.chef_cook_executions (cook_plan_id);

alter table public.chef_cook_executions enable row level security;

-- Policy: Users own their executions
create policy "Users can manage their own cook executions"
  on public.chef_cook_executions for all
  using (auth.uid() = owner_user_id);

commit;
