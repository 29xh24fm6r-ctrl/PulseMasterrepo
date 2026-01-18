begin;

-- Helper: UTC day boundaries
create or replace function public.utc_day_bounds(p_day date)
returns table(day_start timestamptz, day_end timestamptz)
language sql
as $$
  select
    (p_day::timestamptz) at time zone 'utc' as day_start,
    ((p_day + 1)::timestamptz) at time zone 'utc' as day_end
$$;

-- Canonical evaluator: recompute progress for all quests for a user/day
create or replace function public.evaluate_daily_quests(
  p_user_id text,
  p_quest_date date
)
returns setof public.daily_quests
language plpgsql
as $$
declare
  v_start timestamptz;
  v_end   timestamptz;
begin
  select day_start, day_end into v_start, v_end
  from public.utc_day_bounds(p_quest_date);

  -- Ensure quests exist (no-op if already created by generator)
  -- (Generator owns creation; evaluator only updates progress.)

  -- For each quest row, compute progress based on quest_key + meta
  -- We update in-place then return all rows.

  -- 1) complete_n_tasks / complete_3_tasks legacy
  update public.daily_quests q
  set progress = least(
        q.target,
        (
          select count(*)
          from public.tasks t
          where t.user_id = p_user_id
            and t.status = 'completed'
            and t.completed_at >= v_start
            and t.completed_at < v_end
        )
      )
  where q.user_id = p_user_id
    and q.quest_date = p_quest_date
    and q.quest_key in ('complete_n_tasks','complete_3_tasks');

  -- 2) focus_finish / complete_1_focus_task
  update public.daily_quests q
  set progress = least(
        q.target,
        (
          select count(*)
          from public.xp_events e
          where e.user_id = p_user_id
            and e.event_type = 'focus_complete'
            and e.occurred_at >= v_start
            and e.occurred_at < v_end
        )
      )
  where q.user_id = p_user_id
    and q.quest_date = p_quest_date
    and q.quest_key in ('focus_finish','complete_1_focus_task');

  -- 3) clear_overdue / clear_1_overdue
  -- A completion counts as "overdue cleared" if due_at existed and was in the past at completion time.
  update public.daily_quests q
  set progress = least(
        q.target,
        (
          select count(*)
          from public.tasks t
          where t.user_id = p_user_id
            and t.status = 'completed'
            and t.completed_at >= v_start
            and t.completed_at < v_end
            and t.due_at is not null
            and t.due_at <= t.completed_at
        )
      )
  where q.user_id = p_user_id
    and q.quest_date = p_quest_date
    and q.quest_key in ('clear_overdue','clear_1_overdue');

  -- 4) complete_high_priority
  update public.daily_quests q
  set progress = least(
        q.target,
        (
          select count(*)
          from public.tasks t
          where t.user_id = p_user_id
            and t.status = 'completed'
            and t.completed_at >= v_start
            and t.completed_at < v_end
            and t.priority >= 5
        )
      )
  where q.user_id = p_user_id
    and q.quest_date = p_quest_date
    and q.quest_key = 'complete_high_priority';

  -- 5) due_soon (complete tasks due within next 24h window at start of day)
  update public.daily_quests q
  set progress = least(
        q.target,
        (
          select count(*)
          from public.tasks t
          where t.user_id = p_user_id
            and t.status = 'completed'
            and t.completed_at >= v_start
            and t.completed_at < v_end
            and t.due_at is not null
            and t.due_at >= v_start
            and t.due_at < (v_start + interval '24 hours')
        )
      )
  where q.user_id = p_user_id
    and q.quest_date = p_quest_date
    and q.quest_key = 'due_soon';

  -- 6) touch_context_work / touch_context_personal (meta.context)
  update public.daily_quests q
  set progress = least(
        q.target,
        (
          select count(*)
          from public.tasks t
          where t.user_id = p_user_id
            and t.status = 'completed'
            and t.completed_at >= v_start
            and t.completed_at < v_end
            and lower(coalesce(t.context,'')) = lower(coalesce(q.meta->>'context',''))
        )
      )
  where q.user_id = p_user_id
    and q.quest_date = p_quest_date
    and q.quest_key in ('touch_context_work','touch_context_personal')
    and (q.meta ? 'context');

  -- Completion flags
  update public.daily_quests q
  set
    is_completed = (q.progress >= q.target),
    completed_at = case
      when (q.progress >= q.target) then coalesce(q.completed_at, now())
      else null
    end
  where q.user_id = p_user_id
    and q.quest_date = p_quest_date;

  -- Return updated rows
  return query
    select *
    from public.daily_quests
    where user_id = p_user_id
      and quest_date = p_quest_date
    order by created_at asc;
end;
$$;

commit;
