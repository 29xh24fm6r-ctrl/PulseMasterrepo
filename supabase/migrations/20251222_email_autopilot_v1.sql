-- =========================
-- AUTOPILOT v1 MIGRATION
-- =========================

-- 1) Extend email_outbox for scheduled sending + undo window + approvals
alter table if exists public.email_outbox
  add column if not exists status text,
  add column if not exists send_intent text,
  add column if not exists approved_by_user boolean default false,
  add column if not exists approved_at timestamptz,
  add column if not exists scheduled_send_at timestamptz,
  add column if not exists undo_until timestamptz,
  add column if not exists cancel_reason text,
  add column if not exists source_draft_id uuid;

-- 2) Helpful indexes for worker + UI
create index if not exists email_outbox_pending_send_idx
on public.email_outbox (status, scheduled_send_at)
where status = 'pending_send';

create index if not exists email_outbox_user_status_idx
on public.email_outbox (user_id, status, created_at);

-- 3) Optional: constrain status and send_intent
do $$
begin
  begin
    alter table public.email_outbox
      add constraint email_outbox_status_check
      check (status is null or status in ('queued','pending_send','sent','failed','canceled'));
  exception when duplicate_object then null;
  end;

  begin
    alter table public.email_outbox
      add constraint email_outbox_send_intent_check
      check (send_intent is null or send_intent in ('safe','real'));
  exception when duplicate_object then null;
  end;
end$$;

-- 4) Audit trail table (append-only)
create table if not exists public.email_send_audit (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  user_id text not null,
  outbox_id uuid not null,

  action text not null,          -- 'approved' | 'scheduled' | 'undo' | 'attempt_send' | 'sent' | 'failed' | 'canceled'
  detail jsonb                   -- freeform metadata (provider id, errors, model, etc.)
);

create index if not exists email_send_audit_user_idx on public.email_send_audit (user_id, created_at desc);
create index if not exists email_send_audit_outbox_idx on public.email_send_audit (outbox_id, created_at desc);

