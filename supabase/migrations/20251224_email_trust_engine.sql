-- 20251224_email_trust_engine.sql
-- Email Trust Engine: Approval lifecycle for queued emails.
-- Safe: uses IF NOT EXISTS guards.

alter table if exists public.email_outbox
  add column if not exists approval_status text not null default 'pending',
  add column if not exists approved_at timestamptz,
  add column if not exists dismissed_at timestamptz,
  add column if not exists defer_until timestamptz,
  add column if not exists decision_note text;

-- Optional helper index for fast "pending approvals" queries
create index if not exists email_outbox_approval_status_idx
  on public.email_outbox (approval_status);

create index if not exists email_outbox_defer_until_idx
  on public.email_outbox (defer_until);

-- If you already have RLS on email_outbox, keep it as-is.
-- This migration is intentionally schema-minimal to avoid canonical rule drift.
