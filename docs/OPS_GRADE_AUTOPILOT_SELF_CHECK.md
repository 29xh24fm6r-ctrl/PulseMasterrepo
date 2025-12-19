# Ops-Grade Autopilot Self-Check

## Prerequisites

1. Run all SQL migrations:
   - `20251217_job_queue_events_ts_default.sql`
   - `20251217_job_queue_rpc_runs.sql`
   - `20251217_job_queue_recover_stuck.sql`

2. Set environment variables:
   ```bash
   JOB_QUEUE_CRON_SECRET=your_secret_here
   PULSE_ADMIN_CLERK_IDS=user_xxx,user_yyy
   ```

## Endpoint Tests

### 1. Correlation Runs API
```bash
# Must be authenticated as admin
GET /api/job-queue/runs?limit=50
```

**Expected**: Returns `{ ok: true, runs: [...] }` with correlation_id, last_ts, counts, sample_job_types

### 2. Jobs by Correlation
```bash
# Must be authenticated as admin
GET /api/job-queue/by-correlation?correlation_id=<uuid>
```

**Expected**: Returns `{ ok: true, jobs: [...] }` ordered by created_at asc

### 3. Stuck Job Recovery (Cron)
```bash
# Requires x-cron-secret header
POST /api/cron/job-queue/recover-stuck?age_seconds=600
```

**Expected**: Returns `{ ok: true, recovered: <int> }`

### 4. Daily Autopilot Scan (Cron)
```bash
# Requires x-cron-secret header
POST /api/cron/autopilot/daily-scan
```

**Expected**: Returns `{ ok: true, enqueued: <n>, skipped: <n>, total_users: <n> }`

### 5. Daily Scan + Tick (Optional)
```bash
# Requires x-cron-secret header
POST /api/cron/autopilot/daily-scan?tick=1&n=25
```

**Expected**: Returns same as above + `tick: { requested: 25, ran_count: <n>, results: [...] }`

### 6. Cancel Job (Admin)
```bash
# Must be authenticated as admin
POST /api/job-queue/cancel
Content-Type: application/json
{ "job_id": "<uuid>", "reason": "optional reason" }
```

**Expected**: Returns `{ ok: true, job_id: "<uuid>", status: "failed" }`

### 7. Requeue with Reason (Admin)
```bash
# Must be authenticated as admin
POST /api/job-queue/requeue
Content-Type: application/json
{ "job_id": "<uuid>", "reason": "optional reason" }
```

**Expected**: Returns `{ ok: true, job_id: "<uuid>", status: "queued" }`

## SQL Verification Queries

### 1. Verify job_queue_events.ts column
```sql
select column_name, is_nullable, column_default
from information_schema.columns
where table_schema='public'
  and table_name='job_queue_events'
  and column_name='ts';
```

**Expected**: `ts`, `NOT NULL`, `now()`

### 2. Verify correlation runs RPC exists
```sql
select proname, prorettype::regtype
from pg_proc
where proname = 'job_queue_runs';
```

**Expected**: Function exists with return type `table(...)`

### 3. Test correlation runs RPC
```sql
-- Replace <user_id> with actual UUID
select * from public.job_queue_runs('<user_id>'::uuid, 10);
```

**Expected**: Returns rows with correlation_id, last_ts, queued, running, succeeded, failed

### 4. Verify stuck recovery RPC exists
```sql
select proname, prorettype::regtype
from pg_proc
where proname = 'job_queue_recover_stuck';
```

**Expected**: Function exists with return type `integer`

### 5. Test stuck recovery (dry run - check stuck jobs)
```sql
select count(*)
from public.job_queue
where status = 'running'
  and locked_at is not null
  and locked_at < (now() - interval '10 minutes');
```

**Expected**: Returns count of stuck jobs (0 if none)

### 6. Verify events use ts (not created_at)
```sql
select id, job_id, ts, level, message
from public.job_queue_events
order by ts desc
limit 10;
```

**Expected**: Returns events with `ts` column (not `created_at`)

### 7. Verify requeue events logged
```sql
select job_id, ts, level, message, meta
from public.job_queue_events
where message = 'requeued'
order by ts desc
limit 5;
```

**Expected**: Returns requeue events with meta containing reason

### 8. Verify cancel events logged
```sql
select job_id, ts, level, message, meta
from public.job_queue_events
where message = 'canceled'
order by ts desc
limit 5;
```

**Expected**: Returns cancel events with level='warn' and meta containing reason

### 9. Verify daily scan jobs enqueued
```sql
select user_id, job_type, status, idempotency_key, payload
from public.job_queue
where job_type = 'autopilot.scan'
  and idempotency_key like 'autopilot.scan:%'
  and payload->>'enqueued_via' = 'cron'
order by created_at desc
limit 10;
```

**Expected**: Returns scan jobs with correlation_id, priority=100, enqueued_via='cron'

## UI Verification

1. **Access Control Plane Jobs**: `/control-plane/jobs`
   - Should require admin authentication
   - Should display jobs with events using `ts` column

2. **Access Control Plane Runs**: `/control-plane/runs`
   - Should require admin authentication
   - Should display runs grouped by correlation_id
   - Should show `last_ts` (not `created_at`)
   - Should allow drilling into jobs for a run

## Common Issues

1. **"Missing env PULSE_ADMIN_CLERK_IDS"**: Set the env var with comma-separated Clerk user IDs
2. **"UNAUTHORIZED_CRON"**: Ensure `x-cron-secret` header matches `JOB_QUEUE_CRON_SECRET`
3. **"FORBIDDEN"**: Your Clerk user ID is not in `PULSE_ADMIN_CLERK_IDS`
4. **RPC not found**: Run the SQL migrations
5. **Events show created_at**: Ensure API uses `ts` and UI renders `e.ts`

