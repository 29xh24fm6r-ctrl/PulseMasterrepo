# C3 Scheduler v1 Self-Check

## Prerequisites

1. Run SQL migrations:
   - `20251217_job_queue_scheduler_cols.sql`
   - `20251217_job_queue_rpc_lease_any_scheduled.sql`

2. Verify columns exist:
   ```sql
   select column_name, data_type, column_default
   from information_schema.columns
   where table_schema='public'
     and table_name='job_queue'
     and column_name in ('cost', 'lane');
   ```
   **Expected**: `cost` (integer, default 1), `lane` (text, default 'default')

## SQL Verification Queries

### 1. Verify Concurrency Cap Works

```sql
-- Enqueue 10 jobs for a test user
-- Replace <user_id> with actual UUID
insert into public.job_queue (
  user_id, job_type, status, run_at, lane, priority
)
select
  '<user_id>'::uuid,
  'test.job',
  'queued',
  now(),
  'default',
  100
from generate_series(1, 10);

-- Check how many are running (should be 0 initially)
select count(*) as running_count
from public.job_queue
where user_id = '<user_id>'::uuid
  and status = 'running';

-- Expected: 0 (or whatever was already running)
```

### 2. Test Scheduler RPC Directly

```sql
-- Call the scheduler RPC (replace <locked_by> with test identifier)
select * from public.job_queue_lease_any_scheduled(
  '<locked_by>'::text,
  300,  -- lock_seconds
  3     -- max_running_per_user
);

-- Check running count again (should be <= 3)
select count(*) as running_count
from public.job_queue
where user_id = '<user_id>'::uuid
  and status = 'running';

-- Expected: <= 3 (concurrency cap enforced)
```

### 3. Verify Lane Priority Ordering

```sql
-- Create test jobs with different lanes
insert into public.job_queue (
  user_id, job_type, status, run_at, lane, priority
) values
  ('<user_id>'::uuid, 'test.cron', 'queued', now(), 'cron', 100),
  ('<user_id>'::uuid, 'test.default', 'queued', now(), 'default', 200),
  ('<user_id>'::uuid, 'test.interactive', 'queued', now(), 'interactive', 50);

-- Call scheduler - should lease interactive first
select * from public.job_queue_lease_any_scheduled(
  'test'::text,
  300,
  3
);

-- Expected: Returns 'test.interactive' job (interactive lane has highest priority)
```

### 4. Verify Priority Within Lane

```sql
-- Create jobs in same lane with different priorities
insert into public.job_queue (
  user_id, job_type, status, run_at, lane, priority
) values
  ('<user_id>'::uuid, 'test.high', 'queued', now(), 'default', 10),
  ('<user_id>'::uuid, 'test.low', 'queued', now(), 'default', 200);

-- Call scheduler - should lease lower priority number first
select * from public.job_queue_lease_any_scheduled(
  'test'::text,
  300,
  3
);

-- Expected: Returns 'test.high' (priority 10 < 200)
```

### 5. Stress Test: Concurrency Cap Enforcement

```sql
-- Setup: Ensure user has 0 running jobs
update public.job_queue
set status = 'queued', locked_at = null, locked_by = null
where user_id = '<user_id>'::uuid
  and status = 'running';

-- Enqueue 10 jobs
insert into public.job_queue (
  user_id, job_type, status, run_at, lane, priority
)
select
  '<user_id>'::uuid,
  'test.job',
  'queued',
  now(),
  'default',
  100
from generate_series(1, 10);

-- Lease jobs in a loop (simulate worker)
-- Run this 10 times:
select * from public.job_queue_lease_any_scheduled(
  'worker-1'::text,
  300,
  3  -- max 3 running per user
);

-- After 3 leases, check running count
select count(*) as running_count
from public.job_queue
where user_id = '<user_id>'::uuid
  and status = 'running';

-- Expected: Exactly 3 (concurrency cap prevents more)
```

### 6. Verify Lane Assignment in Enqueued Jobs

```sql
-- Check user-triggered jobs (should be interactive)
select job_type, lane, priority
from public.job_queue
where job_type = 'autopilot.scan'
  and payload->>'enqueued_via' is null  -- user-triggered
order by created_at desc
limit 5;

-- Expected: lane='interactive', priority=10

-- Check cron-triggered jobs
select job_type, lane, priority
from public.job_queue
where job_type = 'autopilot.scan'
  and payload->>'enqueued_via' = 'cron'
order by created_at desc
limit 5;

-- Expected: lane='cron', priority=100

-- Check fanout jobs (intel.rebuild_contact)
select job_type, lane, priority
from public.job_queue
where job_type = 'intel.rebuild_contact'
order by created_at desc
limit 5;

-- Expected: lane='default', priority=200
```

## Endpoint Tests

### 1. Verify Runner Uses New RPC

```bash
# Call cron tick endpoint (should use job_queue_lease_any_scheduled)
POST /api/cron/job-queue/tick?n=10
Header: x-cron-secret: <secret>
```

**Expected**: Jobs are leased with concurrency caps enforced

### 2. Verify Control Plane Shows Lane/Cost

```bash
# Access control plane
GET /control-plane/jobs
```

**Expected**: 
- Jobs display lane badge (interactive=blue, default=gray, cron=purple)
- Jobs with cost > 1 show cost badge
- Lane filter dropdown works
- Running count badge shows per-user running jobs

## Safety Notes: Why This Design Cannot Double-Lease Jobs

1. **Atomic Leasing**: The RPC uses `FOR UPDATE SKIP LOCKED`, which ensures only one transaction can lock a row at a time.

2. **Single RPC Call**: The entire lease operation (check eligibility + update status) happens in one atomic SQL transaction.

3. **Concurrency Check Inside SQL**: The user's running job count is checked inside the same transaction, preventing race conditions where two workers both see "2 running" and both lease a 3rd job.

4. **SKIP LOCKED**: If a job is already locked by another transaction, it's skipped entirely, preventing double-leasing.

5. **Status Update is Atomic**: The `UPDATE` that sets `status='running'` and `locked_at=now()` is atomic - either it succeeds for one worker or fails for all others.

## Common Issues

1. **"Function job_queue_lease_any_scheduled does not exist"**: Run the migration `20251217_job_queue_rpc_lease_any_scheduled.sql`

2. **"Column 'lane' does not exist"**: Run the migration `20251217_job_queue_scheduler_cols.sql`

3. **Jobs not respecting concurrency cap**: Verify the RPC is being called (not the old `job_queue_lease_any_next`)

4. **Wrong lane/priority on enqueued jobs**: Check that enqueue code sets `lane` and `priority` correctly

5. **Control plane not showing lane**: Verify API returns `lane` and `cost` in select, and UI renders them

