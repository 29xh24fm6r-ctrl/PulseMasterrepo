# C8/C9 Smoke Tests (SQL)

## Prerequisites

1. Ensure C8/C9 migrations are applied:
   - `job_queue_complete_c8` RPC exists
   - `job_queue_sla_escalate_c9` RPC exists
   - `job_queue_credits_ledger` table exists

2. Have a test job in `running` status (or create one):

```sql
-- Create a test job (if needed)
insert into public.job_queue (
  user_id,
  job_type,
  status,
  run_at,
  lane,
  priority,
  cost,
  payload
)
values (
  (select id from public.users limit 1), -- Replace with actual user_id
  'test.smoke',
  'running',
  now(),
  'default',
  100,
  5,
  '{}'::jsonb
)
returning id;
```

## Test 1: Complete a Running Job Successfully

```sql
-- Replace <job_id> with actual UUID from above
select * from public.job_queue_complete_c8(
  '<job_id>'::uuid,
  'c8-sql-smoke',
  'succeeded',
  null,
  '{"ok":true}'::jsonb,
  '{"source":"sql_smoke"}'::jsonb
);
```

**Expected**:
- Job status becomes `succeeded`
- `finished_at` is set
- Credits are debited (check ledger)
- Job is removed from running queue

**Verify**:
```sql
-- Check job status
select id, status, finished_at, last_error
from public.job_queue
where id = '<job_id>'::uuid;

-- Check credits ledger
select *
from public.job_queue_credits_ledger
where job_id = '<job_id>'::uuid
order by created_at desc
limit 5;
```

## Test 2: Force a Retry + Verify Refund Occurs

First, create another test job:

```sql
-- Create a test job for retry
insert into public.job_queue (
  user_id,
  job_type,
  status,
  run_at,
  lane,
  priority,
  cost,
  payload,
  attempts,
  max_attempts
)
values (
  (select id from public.users limit 1), -- Replace with actual user_id
  'test.retry',
  'running',
  now(),
  'default',
  100,
  10, -- Higher cost to see refund clearly
  1,  -- attempts
  3   -- max_attempts
)
returning id;
```

Then complete with retry outcome:

```sql
-- Replace <job_id> with actual UUID
select * from public.job_queue_complete_c8(
  '<job_id>'::uuid,
  'c8-sql-smoke',
  'retry',
  'transient upstream error',
  null,
  '{"source":"sql_smoke"}'::jsonb
);
```

**Expected**:
- Job status becomes `queued` (requeued)
- `run_at` is updated with backoff delay
- Credits are refunded (check ledger for positive delta)
- `attempts` is incremented

**Verify refund ledger entry**:

```sql
select *
from public.job_queue_credits_ledger
where job_id = '<job_id>'::uuid
order by created_at desc
limit 10;
```

You should see:
- First entry: negative delta (debit when leased)
- Second entry: positive delta (refund on retry)

**Verify job requeued**:

```sql
select id, status, attempts, run_at, last_error
from public.job_queue
where id = '<job_id>'::uuid;
```

Expected: `status = 'queued'`, `attempts = 2`, `run_at` is in the future.

## Test 3: Complete with Failed Outcome

```sql
-- Create a test job for failure
insert into public.job_queue (
  user_id,
  job_type,
  status,
  run_at,
  lane,
  priority,
  cost,
  payload,
  attempts,
  max_attempts
)
values (
  (select id from public.users limit 1),
  'test.failed',
  'running',
  now(),
  'default',
  100,
  5,
  '{}'::jsonb,
  3,  -- attempts (at max)
  3   -- max_attempts
)
returning id;
```

```sql
-- Replace <job_id> with actual UUID
select * from public.job_queue_complete_c8(
  '<job_id>'::uuid,
  'c8-sql-smoke',
  'failed',
  'Permanent error: invalid input',
  null,
  '{"source":"sql_smoke"}'::jsonb
);
```

**Expected**:
- Job status becomes `failed`
- `finished_at` is set
- Credits are NOT refunded (permanent failure)
- Job is not requeued

**Verify**:

```sql
select id, status, attempts, finished_at, last_error
from public.job_queue
where id = '<job_id>'::uuid;
```

Expected: `status = 'failed'`, `finished_at` is set, `last_error` contains the error message.

## Test 4: SLA Escalation Run

```sql
-- Run SLA escalation
select public.job_queue_sla_escalate_c9(
  50,  -- priority_bump
  'fast' -- lane_when_breached
);
```

**Expected**:
- Jobs approaching SLA breach get priority bumped
- Jobs that breach SLA get moved to `fast` lane
- Returns count of jobs updated

**Verify**:

```sql
-- Check for jobs that were escalated
select id, job_type, lane, priority, run_at, created_at
from public.job_queue
where status = 'queued'
  and (
    lane = 'fast' -- moved to fast lane
    or priority < 100 -- priority was bumped (lower = higher priority)
  )
order by updated_at desc
limit 10;
```

## Test 5: End-to-End Flow

1. **Lease a job** (via C7):
   ```sql
   -- This would normally be done via API, but for testing:
   -- Enqueue a job first
   insert into public.job_queue (
     user_id, job_type, status, run_at, lane, priority, cost
   )
   values (
     (select id from public.users limit 1),
     'test.e2e',
     'queued',
     now(),
     'default',
     100,
     3
   )
   returning id;
   ```

2. **Manually mark as running** (simulating lease):
   ```sql
   update public.job_queue
   set status = 'running', started_at = now(), locked_by = 'test-worker'
   where id = '<job_id>'::uuid;
   ```

3. **Complete with success**:
   ```sql
   select * from public.job_queue_complete_c8(
     '<job_id>'::uuid,
     'test-worker',
     'succeeded',
     null,
     '{"result":"ok"}'::jsonb,
     '{}'::jsonb
   );
   ```

4. **Verify full flow**:
   ```sql
   -- Job is completed
   select id, status, finished_at from public.job_queue where id = '<job_id>'::uuid;
   
   -- Credits were debited
   select * from public.job_queue_credits_ledger where job_id = '<job_id>'::uuid;
   
   -- Decision was logged (if C7 telemetry is enabled)
   select * from public.job_queue_scheduler_decisions where job_id = '<job_id>'::uuid;
   ```

## Common Issues

### "Function job_queue_complete_c8 does not exist"

Run the C8 migration that creates this RPC.

### "Job not found or not in running status"

Ensure the job exists and has `status = 'running'` before calling completion.

### "Credits not refunded on retry"

Check that:
1. `job_queue_apply_credits` RPC exists
2. User has sufficient credits balance
3. RPC is called with positive delta for refund

### "SLA escalation not updating jobs"

Check that:
1. Jobs exist with `status = 'queued'`
2. Jobs have `run_at` in the past (or approaching SLA threshold)
3. RPC parameters are correct

### "Job not requeued on retry"

Check that:
1. `attempts < max_attempts`
2. Outcome is `'retry'` (not `'failed'`)
3. RPC sets `run_at` with backoff delay

