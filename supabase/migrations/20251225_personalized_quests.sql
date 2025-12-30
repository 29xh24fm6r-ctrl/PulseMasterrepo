begin;

-- 1) Quest catalog: canonical templates the generator can pick from
create table if not exists public.quest_catalog (
  quest_key text primary key, -- stable ID
  title text not null,
  description text not null,
  base_target int not null default 1,
  base_reward_xp int not null default 25,
  tags text[] not null default '{}',
  meta jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.quest_catalog is 'Quest templates used by personalized daily quest generator.';
comment on column public.quest_catalog.quest_key is 'Stable quest identifier used in daily_quests.quest_key.';

drop trigger if exists trg_quest_catalog_updated_at on public.quest_catalog;
create trigger trg_quest_catalog_updated_at
before update on public.quest_catalog
for each row execute function public.set_updated_at();

-- 2) Generation audit: what signals produced which quests (debuggable)
create table if not exists public.daily_quest_generation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  quest_date date not null,
  algo_version text not null default 'v1',
  signals jsonb not null default '{}'::jsonb,
  selections jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists dqgr_user_day_idx
  on public.daily_quest_generation_runs (user_id, quest_date desc);

-- 3) Seed catalog rows (idempotent upsert)
insert into public.quest_catalog (quest_key, title, description, base_target, base_reward_xp, tags, meta, is_active)
values
  ('complete_n_tasks', 'Execute {n} tasks', 'Complete {n} tasks today to build momentum.', 3, 50, array['execution'], '{}'::jsonb, true),
  ('clear_overdue', 'Clear {n} overdue', 'Complete {n} overdue task(s) today to reduce pressure.', 1, 45, array['overdue'], '{}'::jsonb, true),
  ('focus_finish', 'Finish {n} Focus task', 'Complete {n} task while in Focus Mode.', 1, 60, array['focus'], '{"requires_focus":true}'::jsonb, true),
  ('complete_high_priority', 'Ship {n} high-priority', 'Complete {n} high-priority task(s) today.', 1, 65, array['priority'], '{}'::jsonb, true),
  ('touch_context_work', 'Advance Work', 'Complete {n} work task(s) to move the needle.', 1, 40, array['context','work'], '{"context":"work"}'::jsonb, true),
  ('touch_context_personal', 'Advance Personal', 'Complete {n} personal task(s) to keep life clean.', 1, 40, array['context','personal'], '{"context":"personal"}'::jsonb, true),
  ('due_soon', 'Handle due soon', 'Complete {n} task(s) due in the next 24 hours.', 1, 55, array['due'], '{}'::jsonb, true)
on conflict (quest_key) do update
set
  title = excluded.title,
  description = excluded.description,
  base_target = excluded.base_target,
  base_reward_xp = excluded.base_reward_xp,
  tags = excluded.tags,
  meta = excluded.meta,
  is_active = excluded.is_active;

commit;
