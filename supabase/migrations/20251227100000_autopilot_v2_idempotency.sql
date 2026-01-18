begin;

-- Prevent duplicate outcomes for the same inbox item + rule across runs
-- (Allows multiple runs, but same rule shouldn't create multiple tasks/follow-ups for same inbox item)
create unique index if not exists uq_inbox_rule_outcome_once
on public.inbox_rule_outcomes (user_id_uuid, inbox_item_id, rule_id)
where matched = true and rule_id is not null;

-- Also prevent duplicate "inbox_actions" conversion types per inbox item (safety net)
create unique index if not exists uq_inbox_actions_once_per_type
on public.inbox_actions (user_id_uuid, inbox_item_id, action_type)
where action_type in ('create_follow_up','create_task');

commit;
