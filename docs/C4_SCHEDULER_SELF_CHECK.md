# C4 Scheduler v2 Self-Check (Budgets + Adaptive Cron)

## Prerequisites

1. Run SQL migrations:
   - `20251217_job_queue_budgets.sql`
   - `20251217_job_queue_rpc_lease_any_budgeted.sql`

2. Verify tables exist:
   ```sql
   select table_name
   from information_schema.tables
   where table_schema='public'
     and table_name in ('job_queue_daily_budget', 'job_queue_budget_ledger');
   ```

## SQL Verification Queries

### 1. Verify Budget Tables Structure

```sql
-- Check daily_budget columns
select column_name, data_type, column_default
from information_schema.columns
where table_schema='public'
  and table_name='job_queue_daily_budget'
order by ordinal_position;

-- Expected: user_id (uuid), day (date), budget (int, default 100), spent (int, default 0), updated_at (timestamptz)

-- Check ledger columns
select column_name, data_type, column_default
from information_schema.columns
where table_schema='public'
  and table_name='job_queue_budget_ledger'
order by ordinal_position;
```

### 2. Test Budget Enforcement: Low Budget Test

```sql
-- Setup: Set a user's budget to 2
-- Replace <user_id> with actual UUID
insert into public.job_queue_daily_budget (user_id, day, budget, spent)
values ('<user_id>'::uuid, (now() at time zone 'utc')::date, 2, 0)
on conflict (user_id, day) do update set budget = 2, spent = 0;

-- Enqueue 5 jobs with cost=1
insert into public.job_queue (
  user_id, job_type, status, run_at, lane, priority, cost
)
select
  '<user_id>'::uuid,
  'test.budget',
  'queued',
  now(),
  'default',
  100,
  1
from generate_series(1, 5);

-- Try to lease jobs (should only lease 2)
-- Run this 5 times:
select * from public.job_queue_lease_any_budgeted(
  'test'::text,
  300,
  3,
  100
);

-- Check how many are running (should be <= 2)
select count(*) as running_count
from public.job_queue
where user_id = '<user_id>'::uuid
  and status = 'running';

-- Expected: Exactly 2 (budget exhausted)

-- Check budget spent
select spent, budget
from public.job_queue_daily_budget
where user_id = '<user_id>'::uuid
  and day = (now() at time zone 'utc')::date;

-- Expected: spent = 2, budget = 2
```

### 3. Test Budget Enforcement: High Cost Job Rejection

```sql
-- Setup: Set budget to 5, spent to 4 (1 remaining)
-- Replace <user_id> with actual UUID
insert into public.job_queue_daily_budget (user_id, day, budget, spent)
values ('<user_id>'::uuid, (now() at time zone 'utc')::date, 5, 4)
on conflict (user_id, day) do update set spent = 4;

-- Enqueue a job with cost=2 (exceeds remaining budget of 1)
insert into public.job_queue (
  user_id, job_type, status, run_at, lane, priority, cost
)
values (
  '<user_id>'::uuid,
  'test.expensive',
  'queued',
  now(),
  'default',
  100,
  2
);

-- Try to lease (should return 0 rows)
select * from public.job_queue_lease_any_budgeted(
  'test'::text,
  300,
  3,
  100
);

-- Expected: 0 rows (job cost 2 > remaining budget 1)

-- Verify job is still queued
select status, cost
from public.job_queue
where user_id = '<user_id>'::uuid
  and job_type = 'test.expensive';

-- Expected: status = 'queued' (not leased)
```

### 4. Verify Budget Ledger Entries

```sql
-- After leasing jobs, check ledger
select user_id, day, job_id, delta, reason, meta
from public.job_queue_budget_ledger
where user_id = '<user_id>'::uuid
  and day = (now() at time zone 'utc')::date
order by ts desc
limit 10;

-- Expected: Rows with delta > 0, reason = 'lease', meta includes job_type/lane
```

### 5. Test Concurrency + Lane Priority Under Budget

```sql
-- Setup: Reset budget to 10
insert into public.job_queue_daily_budget (user_id, day, budget, spent)
values ('<user_id>'::uuid, (now() at time zone 'utc')::date, 10, 0)
on conflict (user_id, day) do update set budget = 10, spent = 0;

-- Enqueue jobs in different lanes
insert into public.job_queue (
  user_id, job_type, status, run_at, lane, priority, cost
) values
  ('<user_id>'::uuid, 'test.cron', 'queued', now(), 'cron', 100, 1),
  ('<user_id>'::uuid, 'test.default', 'queued', now(), 'default', 200, 1),
  ('<user_id>'::uuid, 'test.interactive', 'queued', now(), 'interactive', 50, 1);

-- Lease jobs (should lease interactive first, then default, then cron)
select * from public.job_queue_lease_any_budgeted(
  'test'::text,
  300,
  3,
  100
);

-- Expected: Returns 'test.interactive' (interactive lane has highest priority)

-- Lease again
select * from public.job_queue_lease_any_budgeted(
  'test'::text,
  300,
  3,
  100
);

-- Expected: Returns 'test.default' (default lane, then cron)
```

### 6. Test Budget Auto-Creation

```sql
-- Ensure no budget row exists for a user
delete from public.job_queue_daily_budget
where user_id = '<user_id>'::uuid
  and day = (now() at time zone 'utc')::date;

-- Enqueue a job
insert into public.job_queue (
  user_id, job_type, status, run_at, lane, priority, cost
)
values (
  '<user_id>'::uuid,
  'test.auto',
  'queued',
  now(),
  'default',
  100,
  1
);

-- Lease (should auto-create budget with default)
select * from public.job_queue_lease_any_budgeted(
  'test'::text,
  300,
  3,
  100  -- default_daily_budget
);

-- Check budget was created
select budget, spent
from public.job_queue_daily_budget
where user_id = '<user_id>'::uuid
  and day = (now() at time zone 'utc')::date;

-- Expected: budget = 100, spent = 1
```

## Endpoint Tests

### 1. Test Adaptive Cron Tick

```bash
# Test with time budget
POST /api/cron/job-queue/tick?n=25&ms=5000&max_running_per_user=3
Header: x-cron-secret: <secret>
```

**Expected**: Returns `{ ok: true, requested: 25, ran: <n>, elapsed_ms: <int>, stopped_reason: "time_budget_exceeded" | "no_jobs_available" | "completed" }`

### 2. Test Budget API

```bash
# Get today's budgets for all users
GET /api/job-queue/budget
# Must be authenticated as admin

# Get budgets for specific user
GET /api/job-queue/budget?user_id=<uuid>&days=30
# Must be authenticated as admin

# Set budget for user/day
POST /api/job-queue/budget
Content-Type: application/json
{
  "user_id": "<uuid>",
  "day": "2025-12-17",
  "budget": 200
}
# Must be authenticated as admin
```

**Expected**: Returns budget data or updated budget

### 3. Verify Control Plane Shows Budget

```bash
# Access control plane
GET /control-plane/jobs
```

**Expected**: 
- Budget widget shows "Budget: X/Y"
- If spent >= budget, shows "(exhausted)" badge in red
- If spent >= 80% of budget, shows amber warning

## Adaptive Cron Tick Example

```bash
# Scenario: Process as many jobs as possible in 8 seconds
POST /api/cron/job-queue/tick?n=100&ms=8000

# Response might be:
{
  "ok": true,
  "requested": 100,
  "ran": 15,
  "elapsed_ms": 7823,
  "stopped_reason": "time_budget_exceeded",
  "results": [...]
}
```

This shows the tick processed 15 jobs before hitting the 8-second time budget.

## Safety Notes: Why Budget Enforcement is Race-Safe

1. **Atomic Budget Check + Spend**: The RPC locks the budget row with `FOR UPDATE` before checking and incrementing spent.

2. **Double-Check Pattern**: After locking, the RPC re-checks `(spent + cost) <= budget` to prevent races where two workers both see "spent=4, budget=5" and both try to lease a cost=1 job.

3. **Single Transaction**: Budget row lock, job lease, and budget increment all happen in one transaction.

4. **SKIP LOCKED on Jobs**: Jobs use `FOR UPDATE SKIP LOCKED`, so if one worker is checking a job, others skip it.

5. **Budget Row Lock**: When checking budget eligibility in the WHERE clause, the budget row is locked, preventing concurrent workers from both seeing "enough budget" and both spending it.

## Common Issues

1. **"Function job_queue_lease_any_budgeted does not exist"**: Run migration `20251217_job_queue_rpc_lease_any_budgeted.sql`

2. **"Column 'cost' does not exist"**: Run migration `20251217_job_queue_scheduler_cols.sql` (from C3)

3. **Jobs not leasing despite budget available**: Check that budget row exists and `spent + cost <= budget`

4. **Budget not auto-creating**: Verify RPC includes the upsert logic for missing budget rows

5. **Control plane not showing budget**: Verify API returns user_id in job list, and UI calls `/api/job-queue/budget`

6. **Adaptive tick not respecting time budget**: Verify `elapsed_ms` check happens before each lease attempt

