-- Seed: Quests + Evaluators + Belt Tracks + Levels
-- Run in Supabase SQL editor once.

begin;

-- Quests
insert into public.quests (key, name, description, quest_meta)
values
  ('daily_workout', 'Daily Workout', 'Complete at least one workout today.', '{"category":"physical"}'),
  ('deep_work', 'Deep Work', 'Complete 60 minutes of deep work today.', '{"category":"career"}'),
  ('discipline_20', 'Discipline 20', 'Earn 20 Discipline XP today.', '{"category":"discipline"}')
on conflict (key) do nothing;

-- Quest evaluators (rule-based, versioned)
insert into public.quest_evaluators (quest_id, evaluator_key, evaluator_version, rule)
select q.id, 'quest.rule', 1,
  case q.key
    when 'daily_workout' then
      jsonb_build_object(
        'window','day',
        'requirements', jsonb_build_array(
          jsonb_build_object('type','evidence','evidence_type','workout.completed','min_count',1)
        )
      )
    when 'deep_work' then
      jsonb_build_object(
        'window','day',
        'requirements', jsonb_build_array(
          jsonb_build_object('type','evidence','evidence_type','deep_work.completed','min_count',1)
        )
      )
    when 'discipline_20' then
      jsonb_build_object(
        'window','day',
        'requirements', jsonb_build_array(
          jsonb_build_object('type','xp','xp_type','xp_discipline','min_total',20)
        )
      )
    else '{}'::jsonb
  end
from public.quests q
where q.key in ('daily_workout','deep_work','discipline_20')
on conflict (quest_id, evaluator_key, evaluator_version) do nothing;

-- Belt tracks
insert into public.belt_tracks (key, name, description, xp_type)
values
  ('discipline', 'Discipline Belt', 'Consistency and follow-through.', 'xp_discipline'),
  ('physical', 'Physical Belt', 'Training and body mastery.', 'xp_physical'),
  ('career', 'Career Belt', 'Deep work and output.', 'xp_career')
on conflict (key) do nothing;

-- Belt levels (example thresholds)
with t as (
  select id, key from public.belt_tracks where key in ('discipline','physical','career')
)
insert into public.belt_levels (track_id, level, name, min_total)
select t.id, v.level, v.name, v.min_total
from t
join (values
  (1,'White',0),
  (2,'Yellow',100),
  (3,'Orange',250),
  (4,'Green',500),
  (5,'Blue',900),
  (6,'Brown',1400),
  (7,'Black',2000)
) as v(level,name,min_total) on true
on conflict (track_id, level) do nothing;

commit;
