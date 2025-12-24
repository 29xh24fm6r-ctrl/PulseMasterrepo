-- Email outbox leasing + retries (bulletproof worker semantics)
-- Goals:
--  - atomic claim/lease to prevent double sends
--  - retry/backoff with next_attempt_at
--  - reclaim expired leases automatically
--  - auditable attempt_count and last_error

begin;

alter table if exists public.email_outbox
  add column if not exists attempt_count int not null default 0,
  add column if not exists max_attempts int not null default 6,
  add column if not exists next_attempt_at timestamptz,
  add column if not exists leased_by text,
  add column if not exists leased_at timestamptz,
  add column if not exists lease_expires_at timestamptz;

-- If you don't already have status, keep yours.
-- Expected statuses for this worker:
--   queued | sending | sent | failed
-- (We do NOT require a separate retrying status; retries are queued with next_attempt_at)

-- Helpful indexes for worker scanning + reclaiming
create index if not exists email_outbox_claim_idx
  on public.email_outbox (status, next_attempt_at, created_at);

create index if not exists email_outbox_lease_exp_idx
  on public.email_outbox (status, lease_expires_at);

-- Atomic claim function:
-- Claims eligible rows and marks them "sending" with a lease.
-- Eligibility:
--  - status='queued' and (next_attempt_at is null OR next_attempt_at <= now())
--  - OR status='sending' but lease_expires_at <= now() (expired lease -> reclaim)
create or replace function public.email_outbox_claim(
  p_limit int,
  p_worker_id text,
  p_lease_seconds int default 120
)
returns setof public.email_outbox
language plpgsql
security definer
as $$
begin
  return query
  with candidates as (
    select o.id
    from public.email_outbox o
    where
      (
        (o.status = 'queued' and (o.next_attempt_at is null or o.next_attempt_at <= now()))
        or
        (o.status = 'sending' and o.lease_expires_at is not null and o.lease_expires_at <= now())
      )
    order by o.created_at asc
    limit greatest(1, least(p_limit, 50))
    for update skip locked
  ),
  updated as (
    update public.email_outbox o
    set
      status = 'sending',
      leased_by = p_worker_id,
      leased_at = now(),
      lease_expires_at = now() + make_interval(secs => greatest(10, p_lease_seconds)),
      -- do not change attempt_count here; we increment when we actually attempt the send
      last_error = null
    where o.id in (select id from candidates)
    returning o.*
  )
  select * from updated;
end;
$$;

-- Lock down function ownership and privileges (adjust role names if needed)
revoke all on function public.email_outbox_claim(int, text, int) from public;
grant execute on function public.email_outbox_claim(int, text, int) to service_role;

commit;

