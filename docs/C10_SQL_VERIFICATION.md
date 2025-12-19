# C10 Provider Health SQL Verification Queries

Run these queries in your Supabase SQL Editor to verify C10 provider health tracking is working correctly.

## Step 1: Verify Provider Events Are Being Logged

Check that provider information is being included in job events:

```sql
select
  (meta->>'provider') as provider,
  (meta->>'event') as event,
  count(*) as count
from public.job_queue_events
where ts > now() - interval '2 hours'
group by 1, 2
order by 3 desc;
```

**Expected**: 
- Should see providers like `azure_document_intelligence`, `openai`, `anthropic`, etc.
- Events should include `completed`, `failed`, `retry` with provider in meta
- Counts should reflect recent job activity

## Step 2: Verify Provider Health View is Populated

Check the provider health status:

```sql
select 
  provider,
  status,
  failure_rate,
  total,
  failed,
  completed,
  window_minutes,
  updated_at
from public.job_provider_health_view
order by failure_rate desc;
```

**Expected**:
- Rows exist for each provider that has had jobs in the last window period
- `status` is one of: `healthy`, `degraded`, `outage`
- `failure_rate` is calculated as `failed / total`
- `updated_at` is recent (within last few hours if health tick is running)

## Step 3: Verify Adaptive Delay Metadata in Retry Events

Check that retry events include adaptive delay information:

```sql
select 
  job_id,
  event,
  (meta->>'provider') as provider,
  (meta->>'delay_seconds') as adaptive_delay,
  (meta->>'base_delay_seconds') as base_delay,
  (meta->>'provider_status') as provider_status,
  ts
from public.job_queue_events
where event = 'retry'
  and meta->>'delay_seconds' is not null
order by ts desc
limit 20;
```

**Expected**:
- `adaptive_delay` should be >= `base_delay`
- If `provider_status` is `degraded` or `outage`, `adaptive_delay` should be significantly higher
- Provider should match the job's provider

## Step 4: Verify Job Events Include Provider in All Lifecycle Events

Check provider tracking across the full job lifecycle:

```sql
select 
  job_id,
  event,
  (meta->>'provider') as provider,
  (meta->>'event') as meta_event,
  ts
from public.job_queue_events
where ts > now() - interval '1 hour'
  and job_id in (
    select id from job_queue 
    where created_at > now() - interval '1 hour'
    limit 10
  )
order by job_id, ts asc;
```

**Expected**:
- Each job should have `leased`, `started`, and either `succeeded` or `failed`/`retry` events
- Provider should be consistent across all events for the same job
- `meta->>'event'` should match lifecycle stage (`completed`, `failed`, `retry`)

## Step 5: Verify Health Tick is Running

Check when the last health tick ran (if you're logging it):

```sql
-- Check if health tick function exists and can be called
select 
  proname,
  prosrc
from pg_proc
where proname = 'job_provider_health_tick_c10';

-- Check recent provider health updates
select 
  provider,
  updated_at,
  now() - updated_at as age
from job_provider_health_view
order by updated_at desc
limit 10;
```

**Expected**:
- `updated_at` should be recent (within last hour if health tick runs regularly)
- All providers with recent jobs should have recent updates

## Step 6: Verify Provider Extraction is Consistent

Check that provider names are normalized (no drift):

```sql
select 
  (meta->>'provider') as provider,
  count(*) as count,
  count(distinct job_id) as job_count
from public.job_queue_events
where ts > now() - interval '24 hours'
  and meta->>'provider' is not null
group by 1
order by 2 desc;
```

**Expected**:
- Only standardized provider names should appear:
  - `azure_document_intelligence`
  - `openai`
  - `anthropic`
  - `c4`, `c8`, `c10`
- No variations like "Azure DI", "azure-di", "docintel", etc.

## Step 7: Test Provider Health Status Thresholds

Manually verify threshold logic (if you want to test):

```sql
-- Create test data scenario
-- (This is for testing purposes - adjust as needed)

-- Check current provider statuses
select 
  provider,
  status,
  failure_rate,
  failed,
  total,
  case 
    when failure_rate >= 0.30 then 'outage'
    when failure_rate >= 0.10 then 'degraded'
    else 'healthy'
  end as expected_status
from job_provider_health_view
where total > 0
order by failure_rate desc;
```

**Expected**:
- `status` should match `expected_status`
- Providers with high failure rates should be marked `degraded` or `outage`

## Step 8: Verify Job Queue Completes Include Provider

Check that job completion events include provider metadata:

```sql
select 
  jq.id as job_id,
  jq.job_type,
  jq.status,
  (jq.payload->>'provider') as payload_provider,
  (select meta->>'provider' from job_queue_events 
   where job_id = jq.id and event = 'completed' 
   order by ts desc limit 1) as event_provider
from job_queue jq
where jq.status in ('succeeded', 'failed')
  and jq.finished_at > now() - interval '1 hour'
limit 20;
```

**Expected**:
- `event_provider` should match `payload_provider` (if present)
- Both should use consistent naming

## Common Issues

### No provider in events

**Cause**: `extractProvider()` not being called, or job payload doesn't include provider

**Fix**: 
1. Verify job handlers call `extractProvider()` or include provider in payload
2. Check that `completeJobC8()` receives provider in meta

### Provider health view empty

**Cause**: Health tick not running, or no completed/failed jobs

**Fix**:
1. Manually run: `select job_provider_health_tick_c10(60, 0.10, 0.30);`
2. Verify jobs are completing/failing
3. Check that events include provider in meta

### Provider names inconsistent

**Cause**: `extractProvider()` not normalizing properly, or manual provider strings in payloads

**Fix**:
1. Update `extractProvider()` to normalize all variations
2. Search codebase for hardcoded provider strings
3. Standardize all provider references to use normalized names

