begin;

alter table public.tasks
  add column if not exists ai_triage jsonb,
  add column if not exists ai_triaged_at timestamptz;

comment on column public.tasks.ai_triage is 'Raw AI triage result (priority/context/due/defer/status rationale).';
comment on column public.tasks.ai_triaged_at is 'When AI triage last ran.';

create index if not exists tasks_ai_triaged_at_idx
  on public.tasks (ai_triaged_at desc);

commit;
