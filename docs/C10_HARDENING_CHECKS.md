# C10 Provider Health Hardening Checks

## 1. Ownership Enforcement Sanity

### Check: `/api/jobs/[jobId]/events` rejects unauthorized access

**Test**:
1. Create a job for User A
2. Try to fetch events as User B (different user)
3. Should return 404 "Job not found"

**Implementation**: ✅ Already implemented in `app/api/jobs/[jobId]/events/route.ts`
- Verifies job ownership via `user_id` check before returning events

## 2. Telemetry Completeness

### Required Events for Full Lifecycle Coverage

Every job should emit these events:

- ✅ **started**: Emitted via `startJobC8()` → `job_queue_start_c8` RPC
- ✅ **completed**: Emitted via `completeJobC8()` with `outcome: "succeeded"`
- ✅ **failed**: Emitted via `completeJobC8()` with `outcome: "failed"`
- ✅ **retry_scheduled**: Emitted via `completeJobC8()` with `outcome: "retry"` (includes `delay_seconds` in meta)
- ⚠️ **recovered_stuck**: Should be emitted by health tick when recovering stuck jobs
- ⚠️ **lost_lease**: Should be emitted if lease expires (if implemented)

### Verification SQL

```sql
-- Check event coverage for a specific job
select event, count(*)
from job_queue_events_c9
where job_id = '<job_id>'::uuid
group by event
order by count desc;

-- Expected: started, completed OR (failed/retry_scheduled)
```

### Implementation Status

- ✅ **started**: Via `startJobC8()` RPC
- ✅ **completed**: Via `completeJobC8()` success path
- ✅ **failed**: Via `completeJobC8()` failure path
- ✅ **retry_scheduled**: Via `completeJobC8()` retry path (logged as "retry" event with delay info)
- ⚠️ **recovered_stuck**: Needs to be added to recovery logic in health tick
- ⚠️ **lost_lease**: Not yet implemented (optional)

## 3. Provider Naming Consistency

### Standard Provider Names (Finite Set)

The `extractProvider()` function should only return one of these:

- `azure_document_intelligence`
- `openai`
- `anthropic`
- `c4`
- `c8`
- `c10`

### Normalization Rules

If you see drift in provider names, normalize at extraction:

```typescript
// Example normalization (already in extractProvider)
if (provider?.toLowerCase().includes("azure") || provider?.includes("document")) {
  return "azure_document_intelligence";
}
```

### Verification Query

```sql
-- Find all unique providers in job events
select distinct meta->>'provider' as provider, count(*) as count
from job_queue_events_c9
where meta->>'provider' is not null
group by meta->>'provider'
order by count desc;

-- Should only see standardized names from the list above
```

### Common Drift Patterns to Normalize

- ❌ "Azure DI" → ✅ "azure_document_intelligence"
- ❌ "azure-di" → ✅ "azure_document_intelligence"
- ❌ "docintel" → ✅ "azure_document_intelligence"
- ❌ "gpt-4" → ✅ "openai"
- ❌ "Claude" → ✅ "anthropic"

## 4. Adaptive Delay Verification

### Test: Provider-Aware Retry Delays

**Scenario**: Provider is degraded, job fails with retryable error

**Expected Behavior**:
1. Base delay calculated (e.g., 60s for attempt 1)
2. Adaptive delay multiplies base delay based on provider status
3. Retry event includes both `delay_seconds` (adaptive) and `base_delay_seconds` (original)

**Verification**:
```sql
-- Check retry events have adaptive delays
select 
  job_id,
  meta->>'provider' as provider,
  meta->>'delay_seconds' as adaptive_delay,
  meta->>'base_delay_seconds' as base_delay,
  meta->>'provider_status' as provider_status
from job_queue_events_c9
where event = 'retry'
  and meta->>'delay_seconds' is not null
order by at desc
limit 20;
```

## 5. Health Tick Coverage

### Verify All Ticks Run Required Operations

Every health tick should:
1. ✅ Compute job queue health
2. ✅ Run SLA escalation
3. ✅ Run provider health tick (C10)

**Verification**: Check `app/api/scheduler/run-health/route.ts` includes all three.

## 6. Provider Health View Accuracy

### Test: Provider Status Reflects Actual Failure Rates

**Expected**:
- `failure_rate < 0.10` → `status = "healthy"`
- `0.10 <= failure_rate < 0.30` → `status = "degraded"`
- `failure_rate >= 0.30` → `status = "outage"`

**Verification SQL**:
```sql
-- Check provider health view matches thresholds
select 
  provider,
  status,
  failure_rate,
  total,
  failed,
  completed
from job_provider_health_view
order by failure_rate desc;

-- Manual verification:
-- - failure_rate < 0.10 should show "healthy"
-- - 0.10 <= failure_rate < 0.30 should show "degraded"
-- - failure_rate >= 0.30 should show "outage"
```

## 7. Timeline Component Robustness

### Edge Cases to Handle

1. **No events**: ✅ Shows "No events yet."
2. **No job_id**: ✅ Component doesn't render (handled by parent)
3. **Stale job_id**: ✅ Fetches events (may be empty, handled gracefully)
4. **Network errors**: ⚠️ Should show error state (not yet implemented)

### Missing Error Handling

Add to `JobTimeline.tsx`:
```typescript
const [error, setError] = useState<string | null>(null);

// In useEffect:
try {
  // ... fetch logic
  setError(null);
} catch (e) {
  setError(e instanceof Error ? e.message : "Failed to load events");
}
```

## 8. Provider Extraction Edge Cases

### Test Cases

1. **payload.provider exists**: Should use it ✅
2. **payload.meta.provider exists**: Should use it ✅
3. **No provider in payload**: Should infer from job_type ✅
4. **job_type doesn't match patterns**: Should return null ✅
5. **payload is null/undefined**: Should return null ✅

### Verification

```typescript
// Test extractProvider function
extractProvider({ provider: "openai" }, "test.job") === "openai"
extractProvider({ meta: { provider: "anthropic" } }, "test.job") === "anthropic"
extractProvider({}, "azure.document.process") === "azure_document_intelligence"
extractProvider({}, "openai.embed") === "openai"
extractProvider({}, "unknown.job") === null
extractProvider(null, "test.job") === null
```

## 9. Component Performance

### Check: Timeline doesn't cause excessive re-renders

- ✅ Uses `useMemo` for grouped events
- ✅ Polls every 5 seconds (reasonable)
- ⚠️ Consider debouncing if event list grows very large (>1000 events)

### Check: Provider panel doesn't overload API

- ✅ Polls every 15 seconds (reasonable)
- ✅ Limits to current view (no pagination needed for small provider set)

## 10. Security: Provider Data Exposure

### Check: Provider health is user-accessible (not sensitive)

**Rationale**: Provider health is system-level data, not user-specific. It's safe to show to all authenticated users.

**If sensitive**: Consider admin-only access for `/api/providers/health`.

## Quick Checklist

- [x] Ownership enforcement in events API
- [x] Started event emitted
- [x] Completed event emitted
- [x] Failed event emitted
- [x] Retry scheduled event emitted with delay info
- [ ] Recovered stuck event (optional)
- [ ] Lost lease event (optional)
- [x] Provider names normalized to finite set
- [x] Adaptive delays computed for retries
- [x] Health tick includes provider tick
- [x] Timeline handles empty states
- [x] Provider extraction handles edge cases
- [ ] Timeline error handling (enhancement)
- [x] Provider health view accuracy verified

