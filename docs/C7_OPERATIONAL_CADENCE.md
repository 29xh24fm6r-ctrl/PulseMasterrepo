# C7 Scheduler Operational Cadence

## Health Snapshots

### Manual Trigger (Testing)

Hit the endpoint to compute and store a health snapshot:

```bash
POST /api/scheduler/run-health
```

**Note**: Requires admin authentication.

This calls `compute_job_queue_health(p_window_seconds := 300)` and stores the result in `job_queue_health_snapshots`.

### Recommended Frequency

- **Testing**: Once per 5 minutes
- **Production**: Every 5 minutes via cron/scheduled job

### Automation (Future)

Once Supabase scheduled jobs or Vercel Cron is enabled, set up:

```sql
-- Example Supabase scheduled job (when available)
select cron.schedule(
  'compute-job-queue-health',
  '*/5 * * * *', -- Every 5 minutes
  $$
  select public.compute_job_queue_health(300);
  $$
);
```

Or via Vercel Cron:

```json
// vercel.json
{
  "crons": [{
    "path": "/api/scheduler/run-health",
    "schedule": "*/5 * * * *"
  }]
}
```

## Alerts (Optional)

If you've added `compute_job_queue_alerts()`:

```sql
-- Run every 5 minutes
select public.compute_job_queue_alerts();
```

This can detect:
- High starvation counts
- SLA breach risks
- Credit exhaustion
- Agent concurrency issues

## Budget Rollover

### Manual Execution (After a Day of Usage)

Run in Supabase SQL Editor:

```sql
-- Rollover yesterday's budgets
select public.compute_job_queue_budget_rollover((now() at time zone 'utc')::date - 1);

-- Prune old budget data (optional, keeps DB clean)
select public.prune_job_queue_budget_rollover();
```

### What It Does

1. **`compute_job_queue_budget_rollover(day)`**:
   - Computes effective budget adjustments based on tier usage
   - Applies rollover rules (e.g., 20% of unused budget carries forward)
   - Updates `job_queue_user_tiers` for the next day

2. **`prune_job_queue_budget_rollover()`**:
   - Removes old budget rollover records (keeps last 30 days)
   - Prevents unbounded growth of historical data

### Recommended Frequency

- **Daily**: Run once per day (after midnight UTC)
- **Time**: 00:05 UTC (5 minutes after midnight to ensure previous day is complete)

### Automation (Future)

```sql
-- Example Supabase scheduled job (when available)
select cron.schedule(
  'job-queue-budget-rollover',
  '5 0 * * *', -- 00:05 UTC daily
  $$
  select public.compute_job_queue_budget_rollover((now() at time zone 'utc')::date - 1);
  select public.prune_job_queue_budget_rollover();
  $$
);
```

## Monitoring Endpoints

### User Decisions

```bash
GET /api/scheduler/me/decisions?limit=200
```

Returns the last N scheduler decisions for the authenticated user.

### System Health

```bash
GET /api/scheduler/health
```

Returns the latest health snapshot.

### Admin Endpoints

```bash
# Health snapshots (admin only)
GET /api/scheduler/admin/health?limit=50

# All decisions (admin only)
GET /api/scheduler/admin/decisions?limit=200&user_id=<uuid>&decision=lease

# Credit balances and ledger (admin only)
GET /api/scheduler/admin/credits?user_id=<uuid>&limit=200

# Grant credits (admin only)
POST /api/scheduler/admin/grant-credits
{
  "user_id": "<uuid>",
  "delta": 1000,
  "reason": "promotional_credits"
}
```

### UI Dashboards

- **User**: Navigate to `/scheduler` to view personal decisions and health
- **Admin**: Navigate to `/admin/scheduler` to view system-wide health and decisions

## C7 Acceptance Checklist

After implementing C7, verify:

- [ ] `job_queue_lease_any_c7` is what workers call (not C6)
- [ ] `job_queue_credits_ledger` fills with `base_spend` / `burst_spend` entries
- [ ] `job_queue.cost` is non-zero and matches ledger entries
- [ ] `job_queue_agents` concurrency caps deferral properly
- [ ] Admin page `/admin/scheduler` shows health + decisions
- [ ] Credit balances update correctly after job execution
- [ ] Burst pricing applies when system load is high
- [ ] Priority-aware leasing respects job priorities
- [ ] Agent concurrency limits prevent over-subscription

## Troubleshooting

### C7 Leasing Not Working

1. Verify `job_queue_lease_any_c7` RPC exists
2. Check that `job_queue_credits_ledger` table exists
3. Verify user has sufficient credits in `job_queue_credit_balances`
4. Check RPC returns `job_id`, `kind`, `payload`, `lane`, `cost`

### Credits Not Debiting

1. Verify `job_queue_apply_credits` RPC exists
2. Check that C7 RPC calls `job_queue_apply_credits` after leasing
3. Verify `job_queue_credit_balances` updates correctly
4. Check ledger entries are created with correct `delta` values

### Cost Mismatch

1. Verify `job_queue.cost` is set when job is enqueued
2. Check that C7 returns the same `cost` value
3. Verify ledger `delta` matches job `cost`
4. Check for burst pricing adjustments in ledger `meta`

### Agent Concurrency Issues

1. Verify `job_queue_agents` table exists and has concurrency limits
2. Check that C7 respects `max_concurrent_jobs` per agent
3. Verify deferral decisions are logged in `job_queue_scheduler_decisions`
4. Check that deferred jobs are requeued with appropriate delay

