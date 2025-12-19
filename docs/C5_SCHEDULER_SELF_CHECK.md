# C5 Scheduler v3 Self-Check (Rate Windows + Fairness + Health)

## Prerequisites

1. Run SQL migrations in order:
   - `20251217_job_queue_scheduler_cols.sql` (C3)
   - `20251217_job_queue_budgets.sql` (C4)
   - `20251217_job_queue_rate_windows_and_fairness.sql` (C5)
   - `20251217_job_queue_rpc_lease_any_c5.sql` (C5)

2. Verify tables exist:
   ```sql
   select table_name
   from information_schema.tables
   where table_schema='public'
     and table_name in (
       'job_queue_rate_window',
       'job_queue_lane_quota',
       'job_queue_fairness_ledger'
     );
   ```

## SQL Verification Queries

### 1. Verify Rate Window Table Structure

```sql
select column_name, data_type, column_default
from information_schema.columns
where table_schema='public'
  and table_name='job_queue_rate_window'
order by ordinal_position;
```

**Expected**: user_id (uuid), window_start (timestamptz), window_seconds (int), limit (int), spent (int, default 0), updated_at (timestamptz)

### 2. Verify Lane Quota Table Structure

```sql
select column_name, data_type, column_default
from information_schema.columns
where table_schema='public'
  and table_name='job_queue_lane_quota'
order by ordinal_position;
```

**Expected**: user_id (uuid), day (date), lane (text), quota (int), spent (int, default 0), updated_at (timestamptz)

### 3. Test Fairness: Lane Priority + Quota Enforcement

```sql
-- Setup: Set lane quotas low for a test user
-- Replace <user_id> with actual UUID
insert into public.job_queue_lane_quota (user_id, day, lane, quota, spent)
values
  ('<user_id>'::uuid, (now() at time zone 'utc')::date, 'interactive', 5, 0),
  ('<user_id>'::uuid, (now() at time zone 'utc')::date, 'cron', 3, 0)
on conflict (user_id, day, lane) do update set quota = excluded.quota, spent = 0;

-- Enqueue 10 cron jobs and 5 interactive jobs
insert into public.job_queue (
  user_id, job_type, status, run_at, lane, priority, cost
)
select
  '<user_id>'::uuid,
  'test.cron',
  'queued',
  now(),
  'cron',
  100,
  1
from generate_series(1, 10);

insert into public.job_queue (
  user_id, job_type, status, run_at, lane, priority, cost
)
select
  '<user_id>'::uuid,
  'test.interactive',
  'queued',
  now(),
  'interactive',
  50,
  1
from generate_series(1, 5);

-- Lease jobs (should lease interactive first, then cron up to quota)
-- Run this 10 times:
select * from public.job_queue_lease_any_c5(
  'test'::text,
  300,
  3,
  100,
  3600,
  30,
  60,
  30,
  10,
  600,
  50
);

-- Check lane quota spent
select lane, spent, quota
from public.job_queue_lane_quota
where user_id = '<user_id>'::uuid
  and day = (now() at time zone 'utc')::date;

-- Expected: interactive spent = 5 (quota exhausted), cron spent = 3 (quota exhausted)

-- Check running jobs by lane
select lane, count(*) as running_count
from public.job_queue
where user_id = '<user_id>'::uuid
  and status = 'running'
group by lane;

-- Expected: interactive = 5, cron = 3 (quota limits enforced)
```

### 4. Test Rate Window Enforcement

```sql
-- Setup: Set rate window limit to 3
-- Replace <user_id> with actual UUID
-- Window start calculation (1 hour buckets)
select date_trunc('second', now()) - 
  (extract(epoch from now())::int % 3600) * interval '1 second' as window_start;

-- Insert rate window row
insert into public.job_queue_rate_window (
  user_id, window_start, window_seconds, limit, spent
)
values (
  '<user_id>'::uuid,
  date_trunc('second', now()) - (extract(epoch from now())::int % 3600) * interval '1 second',
  3600,
  3,
  0
)
on conflict (user_id, window_start, window_seconds) do update set limit = 3, spent = 0;

-- Enqueue 10 jobs
insert into public.job_queue (
  user_id, job_type, status, run_at, lane, priority, cost
)
select
  '<user_id>'::uuid,
  'test.rate',
  'queued',
  now(),
  'default',
  100,
  1
from generate_series(1, 10);

-- Lease jobs (should only lease 3 per window)
-- Run this 10 times:
select * from public.job_queue_lease_any_c5(
  'test'::text,
  300,
  3,
  100,
  3600,  -- window_seconds
  3,     -- window_limit (low for test)
  60,
  30,
  10,
  600,
  50
);

-- Check rate window spent
select spent, limit
from public.job_queue_rate_window
where user_id = '<user_id>'::uuid
  and window_start = date_trunc('second', now()) - (extract(epoch from now())::int % 3600) * interval '1 second'
  and window_seconds = 3600;

-- Expected: spent = 3 (rate limit enforced)

-- Check running jobs
select count(*) as running_count
from public.job_queue
where user_id = '<user_id>'::uuid
  and status = 'running';

-- Expected: <= 3 (concurrency cap) and <= 3 (rate window limit)
```

### 5. Test Anti-Starvation Boost

```sql
-- Setup: Enqueue a low-priority job and wait (or manually set created_at to past)
-- Replace <user_id> with actual UUID
insert into public.job_queue (
  user_id, job_type, status, run_at, lane, priority, cost, created_at
)
values (
  '<user_id>'::uuid,
  'test.starving',
  'queued',
  now(),
  'default',
  200,  -- Low priority
  1,
  now() - interval '15 minutes'  -- Created 15 minutes ago (starvation threshold = 10 min)
);

-- Enqueue a higher-priority job created recently
insert into public.job_queue (
  user_id, job_type, status, run_at, lane, priority, cost
)
values (
  '<user_id>'::uuid,
  'test.recent',
  'queued',
  now(),
  'default',
  100,  -- Higher priority
  1
);

-- Lease job (should lease starving job first due to boost)
select * from public.job_queue_lease_any_c5(
  'test'::text,
  300,
  3,
  100,
  3600,
  30,
  60,
  30,
  10,
  600,  -- starvation_seconds
  50   -- starvation_boost (reduces effective priority by 50)
);

-- Expected: Returns 'test.starving' (effective priority 200-50=150 < 100, but starvation boost applies in ordering)
-- Note: The ordering logic prioritizes starvation-boosted jobs within the same lane

-- Verify fairness ledger recorded starvation boost
select event, meta
from public.job_queue_fairness_ledger
where user_id = '<user_id>'::uuid
  and job_id = (select id from public.job_queue where job_type = 'test.starving')
order by ts desc
limit 1;

-- Expected: event = 'lease', meta includes 'starvation_boost_applied': true
```

### 6. Verify All Constraints Work Together

```sql
-- Setup: Set all limits low
-- Replace <user_id> with actual UUID
insert into public.job_queue_daily_budget (user_id, day, budget, spent)
values ('<user_id>'::uuid, (now() at time zone 'utc')::date, 5, 0)
on conflict (user_id, day) do update set budget = 5, spent = 0;

insert into public.job_queue_rate_window (user_id, window_start, window_seconds, limit, spent)
values (
  '<user_id>'::uuid,
  date_trunc('second', now()) - (extract(epoch from now())::int % 3600) * interval '1 second',
  3600,
  3,
  0
)
on conflict (user_id, window_start, window_seconds) do update set limit = 3, spent = 0;

insert into public.job_queue_lane_quota (user_id, day, lane, quota, spent)
values ('<user_id>'::uuid, (now() at time zone 'utc')::date, 'default', 2, 0)
on conflict (user_id, day, lane) do update set quota = 2, spent = 0;

-- Enqueue 10 jobs
insert into public.job_queue (
  user_id, job_type, status, run_at, lane, priority, cost
)
select
  '<user_id>'::uuid,
  'test.all',
  'queued',
  now(),
  'default',
  100,
  1
from generate_series(1, 10);

-- Lease jobs (should stop at minimum constraint: lane quota = 2)
-- Run this 10 times:
select * from public.job_queue_lease_any_c5(
  'test'::text,
  300,
  3,
  5,   -- daily budget
  3600,
  3,   -- rate window
  60,
  2,   -- lane quota default (lowest constraint)
  10,
  600,
  50
);

-- Check all spend counters
select 'budget' as type, spent, budget as limit
from public.job_queue_daily_budget
where user_id = '<user_id>'::uuid
  and day = (now() at time zone 'utc')::date
union all
select 'rate_window', spent, limit
from public.job_queue_rate_window
where user_id = '<user_id>'::uuid
  and window_start = date_trunc('second', now()) - (extract(epoch from now())::int % 3600) * interval '1 second'
  and window_seconds = 3600
union all
select 'lane_quota', spent, quota
from public.job_queue_lane_quota
where user_id = '<user_id>'::uuid
  and day = (now() at time zone 'utc')::date
  and lane = 'default';

-- Expected: lane_quota spent = 2 (stopped by lowest constraint)
```

## Endpoint Tests

### 1. Test Health API

```bash
# Must be authenticated as admin
GET /api/job-queue/health
```

**Expected**: Returns counts, oldest queued, stuck running, exhaustion lists, starving jobs

### 2. Test Fairness API

```bash
# Get fairness data for specific user
GET /api/job-queue/fairness?user_id=<uuid>
# Must be authenticated as admin

# Get fairness data for all users (today)
GET /api/job-queue/fairness
# Must be authenticated as admin
```

**Expected**: Returns budget, rate window, and lane quotas for user(s)

### 3. Test Cron Snapshot

```bash
# Requires x-cron-secret header
GET /api/cron/job-queue/snapshot
```

**Expected**: Returns compact snapshot with counts and exhaustion counts

### 4. Test Adaptive Tick with C5 Parameters

```bash
# Test with custom rate window and quotas
POST /api/cron/job-queue/tick?n=25&ms=8000&window_seconds=1800&window_limit=10&lane_quota_cron=5
Header: x-cron-secret: <secret>
```

**Expected**: Returns `{ ok: true, ran: <n>, elapsed_ms: <int>, stopped_reason: <string> }`

### 5. Verify Scheduler Health Dashboard

```bash
# Access dashboard
GET /control-plane/scheduler
```

**Expected**: 
- Shows global queue health
- Shows fairness + quotas exhaustion
- Shows starvation watchlist
- "Tick Now" and "Recover Stuck" buttons work

## Migration Apply Order

1. **C3 Scheduler v1** (if not already applied):
   - `20251217_job_queue_scheduler_cols.sql`

2. **C4 Scheduler v2** (if not already applied):
   - `20251217_job_queue_budgets.sql`
   - `20251217_job_queue_rpc_lease_any_budgeted.sql`

3. **C5 Scheduler v3**:
   - `20251217_job_queue_rate_windows_and_fairness.sql`
   - `20251217_job_queue_rpc_lease_any_c5.sql`

## Safety Notes: Why C5 Design is Race-Safe

1. **Atomic Multi-Table Locking**: The RPC locks job, budget, rate window, and lane quota rows in a single `FOR UPDATE` statement.

2. **Double-Check After Lock**: After locking all rows, the RPC re-verifies all constraints before spending.

3. **Single Transaction**: All constraint checks, job lease, and spend increments happen in one transaction.

4. **SKIP LOCKED**: Jobs use `FOR UPDATE SKIP LOCKED`, preventing concurrent workers from processing the same job.

5. **Window Bucket Alignment**: Rate windows use aligned buckets (not sliding), preventing edge cases where a job could be counted in multiple windows.

6. **Starvation Boost is Ordering-Only**: The boost doesn't mutate the job row, only affects selection ordering, so it's safe under concurrency.

## Common Issues

1. **"Function job_queue_lease_any_c5 does not exist"**: Run migration `20251217_job_queue_rpc_lease_any_c5.sql`

2. **"Column 'lane' does not exist"**: Run C3 migration `20251217_job_queue_scheduler_cols.sql`

3. **"Table 'job_queue_rate_window' does not exist"**: Run migration `20251217_job_queue_rate_windows_and_fairness.sql`

4. **Jobs not respecting lane quota**: Verify lane quota rows exist and quotas are set correctly

5. **Rate window not enforcing**: Verify window_start calculation matches between enqueue and lease

6. **Starvation boost not working**: Check that `created_at` or `run_at` is old enough (> starvation_seconds)

7. **Health dashboard shows no data**: Verify admin authentication and API routes are accessible

