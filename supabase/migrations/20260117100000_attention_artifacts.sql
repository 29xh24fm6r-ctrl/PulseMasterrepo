-- ============================================================
-- PULSE — ATTENTION / MEMORY ARTIFACTS (SIGNAL CAPTURE)
-- ============================================================

create table if not exists public.attention_artifacts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,

  source text not null check (source in ('voice','ui','system')),
  artifact_type text not null, -- reminder_candidate | friction | interruption | focus | frustration

  content text not null,

  context jsonb not null default '{}'::jsonb,
  confidence numeric null,

  created_at timestamptz not null default now()
);

create index if not exists attention_artifacts_owner_idx
on public.attention_artifacts (owner_user_id, created_at desc);

alter table public.attention_artifacts enable row level security;

drop policy if exists "attention_artifacts_owner_select" on public.attention_artifacts;
create policy "attention_artifacts_owner_select"
on public.attention_artifacts for select
using (owner_user_id = auth.uid());

drop policy if exists "attention_artifacts_owner_insert" on public.attention_artifacts;
create policy "attention_artifacts_owner_insert"
on public.attention_artifacts for insert
with check (owner_user_id = auth.uid());
