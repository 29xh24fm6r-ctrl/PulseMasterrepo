-- =========================
-- AUTOPILOT v2 MIGRATION
-- =========================

-- 1) Rules: per-user auto approval policy
create table if not exists public.email_autopilot_rules (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  user_id text not null,
  enabled boolean not null default true,

  -- scope
  kind text,                 -- 'reply' | 'follow_up' | null (any)
  triage_label text,         -- 'needs_reply' | 'request' | 'waiting_on_them' | 'fyi' | null (any)
  min_confidence numeric,    -- 0..1 (null = ignore)

  -- allow/deny controls
  allow_domains text[] default '{}'::text[],
  deny_domains text[] default '{}'::text[],
  allow_emails text[] default '{}'::text[],
  deny_emails text[] default '{}'::text[],

  -- safety caps
  max_per_day int not null default 10,

  -- scheduling
  delay_seconds int not null default 0,          -- delay before scheduled_send_at
  intent text not null default 'safe',           -- 'safe' or 'real' (real still gated by env)

  -- optional text matchers (simple substring match)
  subject_includes text[] default '{}'::text[],
  subject_excludes text[] default '{}'::text[],
  snippet_includes text[] default '{}'::text[],
  snippet_excludes text[] default '{}'::text[]
);

create index if not exists email_autopilot_rules_user_idx on public.email_autopilot_rules (user_id, enabled);

-- updated_at trigger (best-effort)
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'set_updated_at_timestamp') then
    create or replace function public.set_updated_at_timestamp()
    returns trigger language plpgsql as $f$
    begin
      new.updated_at = now();
      return new;
    end $f$;
  end if;
exception when others then
  -- ignore if restricted
  null;
end$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_email_autopilot_rules_updated_at') then
    create trigger trg_email_autopilot_rules_updated_at
    before update on public.email_autopilot_rules
    for each row execute function public.set_updated_at_timestamp();
  end if;
exception when others then null;
end$$;

-- 2) Decision log: why something was auto-approved or skipped
create table if not exists public.email_autopilot_decisions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  user_id text not null,
  rule_id uuid,
  draft_id uuid,
  source_event_id uuid,

  decision text not null,         -- 'auto_approved' | 'skipped' | 'blocked'
  reason text,
  detail jsonb
);

create index if not exists email_autopilot_decisions_user_idx on public.email_autopilot_decisions (user_id, created_at desc);
create index if not exists email_autopilot_decisions_draft_idx on public.email_autopilot_decisions (draft_id);

-- 3) Daily counter helper view (optional; convenience)
create or replace view public.email_autopilot_autoapproved_today as
select
  user_id,
  count(*) as autoapproved_count
from public.email_autopilot_decisions
where decision = 'auto_approved'
  and created_at >= date_trunc('day', now())
group by user_id;


