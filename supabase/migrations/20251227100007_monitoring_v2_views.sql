begin;

create or replace view public.health_recent_failures as
select
  'inbox_autopilot' as domain,
  user_id_uuid,
  started_at as occurred_at,
  error as message,
  id::text as ref
from public.inbox_rule_runs
where status='failed'
  and started_at > now() - interval '7 days'
union all
select
  'api' as domain,
  user_id_uuid,
  created_at as occurred_at,
  coalesce(error, event_name) as message,
  event_fingerprint as ref
from public.pulse_events
where status >= 400
  and created_at > now() - interval '7 days';

commit;
