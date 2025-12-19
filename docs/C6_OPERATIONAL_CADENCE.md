# C6 Scheduler Operational Cadence

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

Returns the latest health snapshot (no auth required, but consider adding rate limiting).

### UI Dashboard

Navigate to `/scheduler` to view:
- Latest health snapshot
- Your personal decision timeline
- Starvation and SLA risk indicators

## Acceptance Checklist

After implementing C6, verify:

- [ ] `job_queue_tiers` and `job_queue_user_tiers` exist + seeded
- [ ] `job_queue_budget_rollover` populates from yesterday
- [ ] `job_queue_scheduler_decisions` records every call
- [ ] `/scheduler` page shows health + decision timeline
- [ ] `job_queue_lease_any_c6` leases jobs while:
  - [ ] Respecting effective budgets
  - [ ] Switching modes (normal/slow_lane/protect)
  - [ ] Flagging starvation + SLA risk

## Troubleshooting

### Health Snapshot Not Updating

1. Check `compute_job_queue_health` RPC exists
2. Verify admin authentication on `/api/scheduler/run-health`
3. Check `job_queue_health_snapshots` table has rows
4. Verify RPC completes without errors

### Budget Rollover Not Working

1. Verify `compute_job_queue_budget_rollover` RPC exists
2. Check that yesterday's date has budget data
3. Verify `job_queue_user_tiers` has rows for the target day
4. Check for SQL errors in Supabase logs

### Decisions Not Appearing

1. Verify `job_queue_lease_any_c6` is being called (not C5)
2. Check `job_queue_scheduler_decisions` table has rows
3. Verify user_id matches authenticated user
4. Check RPC is inserting decision rows

