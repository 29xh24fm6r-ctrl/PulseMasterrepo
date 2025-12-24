begin;

-- Read model: join triage item + thread for inbox UI
create or replace view public.email_triage_inbox_v as
select
  ti.id as triage_id,
  ti.user_id,
  ti.email_thread_id,
  ti.urgency,
  ti.suggested_action,
  ti.state,
  ti.score,
  ti.next_action_at,
  ti.why,
  ti.evidence,
  ti.updated_at as triage_updated_at,

  t.subject,
  t.snippet,
  t.last_message_from as from_email,
  t.last_message_at,
  t.updated_at as thread_updated_at
from public.email_triage_items ti
join public.email_threads t
  on t.id = ti.email_thread_id;

commit;

