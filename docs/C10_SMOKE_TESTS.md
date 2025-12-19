# C10 Provider Health Smoke Tests

## Prerequisites

1. C10 migrations applied:
   - `job_provider_health_view` exists
   - `job_queue_adaptive_delay_c10` RPC exists
   - `job_provider_health_tick_c10` RPC exists
   - `job_queue_events_c9` view exists

2. Have test jobs that use providers:
   - Azure Document Intelligence jobs
   - OpenAI jobs
   - Any other provider-integrated jobs

## Test 1: Trigger Provider Health Tick

### Step 1: Run Health Tick

```bash
POST /api/scheduler/run-health
# Requires admin authentication
```

**Expected**: Returns `{ ok: true }`

### Step 2: Verify Provider Health View Populated

```sql
select provider, status, failure_rate, total, failed, completed, updated_at
from job_provider_health_view
order by updated_at desc;
```

**Expected**: 
- Rows exist for providers that have completed/failed jobs
- `status` is one of: `healthy`, `degraded`, `outage`
- `failure_rate` is calculated correctly: `failed / total`
- `updated_at` is recent (within last few minutes)

## Test 2: Generate Known Provider Events

### Step 2.1: Enqueue Job with Provider

```typescript
// Example: Enqueue a job with provider in payload
const { data } = await supabaseAdmin.from("job_queue").insert({
  user_id: userId,
  job_type: "azure.document.process",
  status: "queued",
  run_at: new Date().toISOString(),
  payload: {
    provider: "azure_document_intelligence",
    document_id: "test-doc-123",
  },
});
```

### Step 2.2: Execute Job (Success Case)

```bash
POST /api/job-queue/run
# As authenticated user
```

**Expected**:
1. Job leases via C7
2. Job starts via C8 start
3. Job completes successfully
4. Events include provider in meta:
   - `leased` event: `meta.provider = "azure_document_intelligence"`
   - `started` event: provider in meta
   - `succeeded` event: `meta.provider = "azure_document_intelligence"`, `meta.event = "completed"`

### Step 2.3: Verify Events Include Provider

```sql
select job_id, event, level, message, meta
from job_queue_events_c9
where job_id = '<job_id>'::uuid
order by at asc;
```

**Expected**: All events have `meta->>'provider' = 'azure_document_intelligence'`

## Test 3: Force Retryable Failure (Provider-Aware Backoff)

### Step 3.1: Simulate Retryable Error

**Option A: Modify handler to throw timeout error**:
```typescript
// In job handler (temporary test)
if (process.env.TEST_RETRY) {
  throw new Error("ETIMEDOUT: Connection timeout");
}
```

**Option B: Direct SQL test**:
```sql
-- Manually mark job as failed with retryable error
update job_queue
set 
  status = 'queued',
  attempts = 1,
  max_attempts = 3,
  last_error = 'ETIMEDOUT: Connection timeout',
  run_at = now() + interval '60 seconds'
where id = '<job_id>'::uuid;
```

### Step 3.2: Trigger Retry with Provider Context

Run the job again (it should retry):

```bash
POST /api/job-queue/run
```

**Expected**:
1. Job retries
2. Adaptive delay computed (longer if provider degraded)
3. Retry event includes:
   - `meta.provider`: provider name
   - `meta.delay_seconds`: adaptive delay (may be > base if provider degraded)
   - `meta.base_delay_seconds`: original backoff delay
   - `meta.retryable`: true

### Step 3.3: Verify Adaptive Delay Applied

```sql
select 
  job_id,
  event,
  meta->>'provider' as provider,
  meta->>'delay_seconds' as adaptive_delay,
  meta->>'base_delay_seconds' as base_delay,
  meta->>'provider_status' as provider_status
from job_queue_events_c9
where job_id = '<job_id>'::uuid
  and event = 'retry'
order by at desc
limit 1;
```

**Expected**:
- `adaptive_delay` >= `base_delay`
- If provider is degraded/outage: `adaptive_delay` >> `base_delay`
- `provider_status` matches current provider health

## Test 4: Verify UI Components

### Step 4.1: Provider Health Panel

**Navigate to**: `/ops/jobs` or page with `<ProviderHealthPanel />`

**Expected**:
- Panel loads without errors
- Shows provider rows with:
  - Provider name
  - Status badge (healthy/degraded/outage)
  - Failure rate percentage
  - Total/failed/completed counts
  - Window minutes

**Test Degraded State**:
1. Trigger multiple failures for a provider (force errors in handlers)
2. Wait for health tick to run
3. Refresh provider panel
4. Provider should show "degraded" or "outage" status

### Step 4.2: Job Timeline

**Navigate to**: Page with `<JobTimeline jobId={jobId} />`

**Expected**:
- Timeline loads without errors
- Shows events in chronological order
- Provider badge appears on events with provider
- Retry events show delay explanation:
  - "Retrying in 120s (provider degraded)" if provider is degraded
  - "Retrying in 30s (normal backoff)" if provider is healthy
- Degraded/outage banner appears if provider status is degraded/outage

**Test Event Grouping**:
1. Generate multiple rapid heartbeat/lease events
2. Verify timeline groups them: "heartbeat × 12"

### Step 4.3: Latest Job Helper

**Test API**:
```bash
GET /api/jobs/by-entity?deal_id=<deal_id>
GET /api/jobs/by-entity?contact_id=<contact_id>
GET /api/jobs/by-entity?upload_id=<upload_id>
```

**Expected**:
- Returns `{ ok: true, job_id: "<uuid>", job_type: "...", status: "...", created_at: "..." }`
- Returns `{ ok: true, job_id: null }` if no job exists
- Rejects unauthorized access (returns 404 for jobs owned by other users)

**Test Hook**:
```typescript
const { jobId, loading } = useLatestJobId("deal", dealId);
// jobId should be latest job for the deal
```

## Test 5: End-to-End Flow

### Scenario: Document Upload → Processing → Timeline

1. **Upload document** (triggers job with `upload_id` in payload)

2. **Job Timeline appears**:
   - Uses `useLatestJobId("upload", uploadId)`
   - Shows timeline with job events
   - Shows provider badge if provider is present

3. **Job processes**:
   - Events update in real-time (5s polling)
   - Status changes: queued → running → completed

4. **Provider health updates**:
   - After health tick runs, provider status reflects actual failure rate
   - If provider degraded, retry events show longer delays

5. **Verify complete flow**:
   ```sql
   -- Check job lifecycle events
   select event, at, meta
   from job_queue_events_c9
   where job_id = '<job_id>'::uuid
   order by at asc;
   
   -- Expected sequence:
   -- 1. leased (with provider in meta)
   -- 2. started (with provider in meta)
   -- 3. succeeded (with provider in meta, event: "completed")
   ```

## Common Issues & Fixes

### Issue: Provider health view is empty

**Possible causes**:
- No jobs have completed/failed yet
- Provider not extracted correctly from payload
- Health tick hasn't run

**Fix**:
1. Run health tick: `POST /api/scheduler/run-health`
2. Check if jobs have provider in payload
3. Verify `extractProvider()` is working

### Issue: Adaptive delay not applied

**Possible causes**:
- Provider is null (not extracted)
- Provider not in health view
- RPC `job_queue_adaptive_delay_c10` missing

**Fix**:
1. Verify provider extraction in job payload
2. Check provider exists in `job_provider_health_view`
3. Verify RPC exists and is callable

### Issue: Timeline shows no events

**Possible causes**:
- Job doesn't exist
- Events not being logged
- View `job_queue_events_c9` not populated

**Fix**:
1. Verify job exists: `select * from job_queue where id = '<job_id>'`
2. Check events table: `select * from job_queue_events where job_id = '<job_id>'`
3. Verify view: `select * from job_queue_events_c9 where job_id = '<job_id>'`

### Issue: Provider status always "healthy"

**Possible causes**:
- Not enough failed jobs to trigger degraded threshold
- Health tick not running
- Thresholds too high

**Fix**:
1. Check failure rate: `select failure_rate, failed, total from job_provider_health_view`
2. Verify thresholds: degraded >= 0.10, outage >= 0.30
3. Force some failures to test thresholds

