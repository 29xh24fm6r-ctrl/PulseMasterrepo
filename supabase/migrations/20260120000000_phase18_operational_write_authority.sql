create table pulse_effects (
  id uuid primary key default gen_random_uuid(),

  owner_user_id uuid not null,

  domain text not null, -- 'tasks' | 'chef' | 'life_state' | 'planning' | 'reflection' | etc
  effect_type text not null, -- 'create' | 'update' | 'delete' | 'derive'

  target_ref text, -- optional opaque identifier (task_id, meal_id, etc)

  payload jsonb not null, -- the intended state mutation

  confidence numeric not null check (confidence >= 0 and confidence <= 1),

  write_mode text not null, -- 'auto' | 'confirm' | 'proposed'

  applied boolean not null default false,
  applied_at timestamptz,

  reverted boolean not null default false,
  reverted_at timestamptz,

  source text not null, -- 'daily_run' | 'voice' | 'manual' | 'recovery'

  created_at timestamptz not null default now()
);

create index on pulse_effects (owner_user_id);
create index on pulse_effects (domain);
create index on pulse_effects (applied);
