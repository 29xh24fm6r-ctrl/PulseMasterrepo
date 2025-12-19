# Pulse OS Runbook

Operational procedures and troubleshooting guide for Pulse OS.

---

## 1. System Health

### Health Endpoints

**GET `/api/health/db`**
- **Purpose**: Verifies database connectivity, auth resolver, and core table access
- **Expected Response**:
  ```json
  {
    "ok": true,
    "supabaseUserId": "uuid-here",
    "tables": {
      "crm_contacts": { "ok": true },
      "tasks": { "ok": true },
      "deals": { "ok": true },
      "habits": { "ok": true },
      "habit_logs": { "ok": true },
      "journal_entries": { "ok": true }
    }
  }
  ```
- **Status Codes**: `200` if all OK, `500` if any table fails
- **Common Failure Modes**:
  - **Missing table**: `tables.<name>.error` will show table doesn't exist
  - **RLS misconfigured**: Query succeeds but returns no rows (check RLS policies)
  - **User resolver fails**: Returns `{ ok: false, error: "..." }` - check Clerk auth and `public.users` table
  - **Environment variables missing**: `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` not set

**GET `/api/health/rls`**
- **Purpose**: Quick sanity check that RLS policies exist on core tables
- **Expected Response**:
  ```json
  {
    "ok": true,
    "rls": {
      "crm_contacts": { "ok": true, "policies": ["policy_name_1", "policy_name_2"] },
      "tasks": { "ok": true, "policies": ["policy_name"] }
    }
  }
  ```
- **Status Codes**: `200` if all tables have policies, `500` if any missing
- **Note**: May return `{ ok: true, skipped: true }` if system views are restricted (non-fatal)

### Health Check Procedure

1. **Check database health**:
   ```bash
   curl http://localhost:3000/api/health/db
   ```

2. **If health check fails**:
   - Verify environment variables are set
   - Check Supabase connection in dashboard
   - Verify `public.users` table exists and has data
   - Check RLS policies are enabled

3. **If RLS check fails**:
   - Review `supabase/migrations/` for missing RLS policies
   - Ensure `current_user_row_id()` function exists
   - Verify policies use `user_id = current_user_row_id()`

---

## 2. Job System (Sprint 4 Core)

### Inspecting Job Queue

**View queued jobs**:
```sql
SELECT id, user_id, job_type, status, attempts, scheduled_at, created_at
FROM job_queue
WHERE status = 'queued'
ORDER BY scheduled_at ASC
LIMIT 50;
```

**View running jobs**:
```sql
SELECT id, user_id, job_type, status, attempts, started_at
FROM job_queue
WHERE status = 'running'
ORDER BY started_at ASC;
```

**View recent job runs**:
```sql
SELECT jr.id, jr.job_id, jq.job_type, jr.status, jr.attempts, jr.started_at, jr.finished_at, jr.last_error
FROM job_runs jr
JOIN job_queue jq ON jr.job_id = jq.id
ORDER BY jr.created_at DESC
LIMIT 50;
```

### Interpreting Job Runs

**Status Values**:
- `queued`: Job is waiting to be claimed
- `running`: Job is currently executing
- `succeeded`: Job completed successfully
- `failed`: Job failed (will retry if attempts < max_attempts)
- `dead_letter`: Job exceeded max attempts

**Key Fields**:
- `attempts`: Current retry count
- `max_attempts`: Maximum retries (default: 3)
- `last_error`: Error message from last failure
- `idempotency_key`: Prevents duplicate execution
- `correlation_id`: Groups related jobs

### Retry Logic Overview

1. **Exponential Backoff**: Each retry waits longer:
   - Attempt 1: Immediate
   - Attempt 2: 1 minute
   - Attempt 3: 4 minutes
   - Attempt 4: 16 minutes

2. **Max Attempts**: Default is 3, configurable per job

3. **Dead Letter**: After max attempts, job moves to `dead_letter` status

### Dead-Letter Procedure

**View dead-letter jobs**:
```sql
SELECT id, user_id, job_type, attempts, last_error, created_at
FROM job_queue
WHERE status = 'dead_letter'
ORDER BY created_at DESC;
```

**Manual Retry** (if needed):
```sql
UPDATE job_queue
SET status = 'queued', attempts = 0, scheduled_at = NOW()
WHERE id = 'job-id-here';
```

**Permanently Delete** (if safe):
```sql
DELETE FROM job_queue WHERE id = 'job-id-here' AND status = 'dead_letter';
```

### Idempotency Key Debugging

**Check for duplicate idempotency keys**:
```sql
SELECT idempotency_key, COUNT(*) as count, array_agg(id) as job_ids
FROM job_queue
WHERE idempotency_key IS NOT NULL
GROUP BY idempotency_key
HAVING COUNT(*) > 1;
```

**Find jobs with same idempotency key**:
```sql
SELECT id, user_id, job_type, status, created_at
FROM job_queue
WHERE idempotency_key = 'your-key-here'
ORDER BY created_at DESC;
```

**Note**: Jobs with same `idempotency_key` + `user_id` + `job_type` will skip execution if one already succeeded.

---

## 3. Automation / Autopilot

### Viewing Suggestions vs Executed Actions

**View all automation actions**:
```sql
SELECT id, user_id, action_type, status, approved_by_user, created_at
FROM automation_actions
WHERE user_id = 'user-uuid-here'
ORDER BY created_at DESC;
```

**View only suggestions** (pending approval):
```sql
SELECT id, action_type, action_payload, created_at
FROM automation_actions
WHERE status = 'suggested' AND user_id = 'user-uuid-here'
ORDER BY created_at DESC;
```

**View executed actions**:
```sql
SELECT id, action_type, result, executed_at
FROM automation_actions
WHERE status = 'executed' AND user_id = 'user-uuid-here'
ORDER BY executed_at DESC;
```

### Approval Flow

1. **Detector scans** → Creates suggestions in `automation_actions` (status: `suggested`)
2. **User reviews** → Via command center UI at `/autopilot/command-center`
3. **User approves** → POST `/api/automation/actions/[id]/approve` → Executes action
4. **Action executed** → Status changes to `executed`, result stored

**Manual Approval** (via API):
```bash
curl -X POST http://localhost:3000/api/automation/actions/{action-id}/approve \
  -H "Authorization: Bearer {token}"
```

**Reject Action**:
```bash
curl -X POST http://localhost:3000/api/automation/actions/{action-id}/reject \
  -H "Authorization: Bearer {token}"
```

### Disabling Automation Per User

**Disable all automation for a user**:
```sql
UPDATE automation_policies
SET enabled = false
WHERE user_id = 'user-uuid-here';
```

**Disable specific policy**:
```sql
UPDATE automation_policies
SET enabled = false
WHERE id = 'policy-id-here';
```

**Check active policies**:
```sql
SELECT id, name, enabled, scopes, max_actions_per_day
FROM automation_policies
WHERE user_id = 'user-uuid-here' AND enabled = true;
```

### Safety Caps (Max Actions/Day)

**Check daily action count**:
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as action_count
FROM automation_actions
WHERE user_id = 'user-uuid-here' 
  AND status = 'executed'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**View policy limits**:
```sql
SELECT name, max_actions_per_day, 
  (SELECT COUNT(*) FROM automation_actions 
   WHERE automation_actions.policy_id = automation_policies.id 
   AND DATE(automation_actions.created_at) = CURRENT_DATE
   AND automation_actions.status = 'executed') as today_count
FROM automation_policies
WHERE user_id = 'user-uuid-here' AND enabled = true;
```

**Default Limits**:
- Max 20 actions per automation run
- Max actions per day per policy (configurable, default: 100)
- Max 50 jobs per cron tick

---

## 4. Agents / Minions

### Where Findings Live

**Agent findings**:
```sql
SELECT id, agent_id, finding_kind, title, detail, created_at
FROM agent_findings
WHERE user_id = 'user-uuid-here'
ORDER BY created_at DESC
LIMIT 50;
```

**Agent reports**:
```sql
SELECT ar.id, a.name, a.agent_type, ar.summary, ar.created_at
FROM agent_reports ar
JOIN agents a ON ar.agent_id = a.id
WHERE ar.user_id = 'user-uuid-here'
ORDER BY ar.created_at DESC
LIMIT 50;
```

**Agent definitions**:
```sql
SELECT id, name, agent_type, enabled, created_at
FROM agents
WHERE user_id = 'user-uuid-here'
ORDER BY created_at DESC;
```

### Troubleshooting an Agent Run

1. **Check agent run via API**:
   ```bash
   curl http://localhost:3000/api/agents/run?agent_type=scout \
     -H "Authorization: Bearer {token}"
   ```

2. **View findings from last run**:
   ```sql
   SELECT af.*, a.name as agent_name
   FROM agent_findings af
   JOIN agents a ON af.agent_id = a.id
   WHERE af.user_id = 'user-uuid-here'
   ORDER BY af.created_at DESC
   LIMIT 20;
   ```

3. **Check for errors in agent_reports**:
   ```sql
   SELECT id, agent_id, summary, error, created_at
   FROM agent_reports
   WHERE user_id = 'user-uuid-here' AND error IS NOT NULL
   ORDER BY created_at DESC;
   ```

### Validating "Agents Cannot Mutate Core Tables"

**Audit check**: Agents should only write to:
- `agent_findings`
- `agent_reports`
- `audit_log` (for logging)

**Verify no direct mutations**:
```sql
-- Check audit_log for agent actions on core tables
SELECT action_type, entity_type, source, payload
FROM audit_log
WHERE source = 'agent'
  AND entity_type IN ('task', 'deal', 'contact', 'habit', 'journal_entry')
  AND created_at >= NOW() - INTERVAL '7 days';
```

**Expected**: No rows (agents should not mutate core tables directly)

**If rows found**: Agent is violating architecture - review agent code.

---

## 5. Incident Playbooks

### DB is Down / Degraded

**Symptoms**:
- Health check `/api/health/db` returns 500
- API routes return database errors
- Jobs failing with connection errors

**Steps**:
1. Check Supabase dashboard for service status
2. Verify environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
3. Test connection:
   ```bash
   curl https://{project}.supabase.co/rest/v1/ \
     -H "apikey: {anon-key}"
   ```
4. If connection works, check RLS policies (may be blocking)
5. Review recent migrations for breaking changes
6. Check Supabase logs for errors

**Rollback** (if needed):
- Revert last migration if issue started after deployment
- Disable automation/jobs temporarily:
  ```sql
  UPDATE automation_policies SET enabled = false;
  -- Pause cron jobs by not calling /api/cron/tick
  ```

### Jobs Stuck in Running

**Symptoms**:
- Jobs in `running` status for > 1 hour
- No new jobs being processed
- Cron tick not claiming jobs

**Steps**:
1. **Check for stuck jobs**:
   ```sql
   SELECT id, job_type, started_at, 
     EXTRACT(EPOCH FROM (NOW() - started_at))/60 as minutes_running
   FROM job_queue
   WHERE status = 'running'
   AND started_at < NOW() - INTERVAL '30 minutes';
   ```

2. **Manually reset stuck jobs** (if safe):
   ```sql
   UPDATE job_queue
   SET status = 'queued', attempts = attempts + 1, started_at = NULL
   WHERE status = 'running'
   AND started_at < NOW() - INTERVAL '1 hour';
   ```

3. **Check cron worker**:
   - Verify `/api/cron/tick` is being called
   - Check cron service (Vercel Cron, etc.)
   - Review cron logs

4. **Check job execution endpoint**:
   - Verify `/api/jobs/execute` is accessible
   - Check service role key is valid
   - Review execution logs

### Automation Loop Detected

**Symptoms**:
- Same action created repeatedly
- High action count in short time
- User reports unexpected automation

**Steps**:
1. **Check recent actions**:
   ```sql
   SELECT action_type, COUNT(*) as count, 
     MIN(created_at) as first, MAX(created_at) as last
   FROM automation_actions
   WHERE user_id = 'user-uuid-here'
   AND created_at >= NOW() - INTERVAL '1 hour'
   GROUP BY action_type
   HAVING COUNT(*) > 10;
   ```

2. **Disable automation immediately**:
   ```sql
   UPDATE automation_policies
   SET enabled = false
   WHERE user_id = 'user-uuid-here';
   ```

3. **Check idempotency keys**:
   ```sql
   SELECT action_type, idempotency_key, COUNT(*) as count
   FROM automation_actions
   WHERE user_id = 'user-uuid-here'
   AND created_at >= NOW() - INTERVAL '1 hour'
   GROUP BY action_type, idempotency_key
   HAVING COUNT(*) > 1;
   ```

4. **Review automation run logs**:
   ```sql
   SELECT id, policy_id, actions_created, actions_executed, error
   FROM automation_runs
   WHERE user_id = 'user-uuid-here'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

5. **Fix root cause**:
   - Check detector logic (may be creating duplicate suggestions)
   - Verify idempotency keys are unique
   - Review policy gating logic

### Emails Sent Unexpectedly (Kill-Switch Steps)

**Symptoms**:
- User reports unexpected emails
- Email actions in automation_actions
- High email volume

**Steps**:
1. **Immediate kill-switch**:
   ```sql
   -- Disable all automation
   UPDATE automation_policies SET enabled = false;
   
   -- Cancel pending email actions
   UPDATE automation_actions
   SET status = 'canceled'
   WHERE action_type LIKE '%email%'
   AND status = 'suggested';
   ```

2. **Check email actions**:
   ```sql
   SELECT id, action_payload, created_at, executed_at
   FROM automation_actions
   WHERE action_type LIKE '%email%'
   AND status = 'executed'
   AND executed_at >= NOW() - INTERVAL '24 hours'
   ORDER BY executed_at DESC;
   ```

3. **Review automation policies**:
   ```sql
   SELECT id, name, scopes, requires_user_confirmation
   FROM automation_policies
   WHERE scopes @> '["email"]'::jsonb
   AND enabled = true;
   ```

4. **Prevent future emails**:
   - Set `requires_user_confirmation = true` for all email policies
   - Add safety constraint: `never send email without confirmation`
   - Review detector logic for email triggers

---

## 6. Guard Scripts

### Running Guards

**All guards**:
```bash
npm run guard
```

**Individual guards**:
```bash
npm run guard:no-service-role
npm run guard:no-notion-runtime
npm run guard:user-id-uuid
```

### What Each Guard Checks

**`guard:no-service-role`**:
- Ensures `SUPABASE_SERVICE_ROLE_KEY` is not referenced in runtime code
- Ensures `lib/supabase/admin` is only imported in server-only contexts
- Allowed locations: `app/api/**`, `lib/**` with `import "server-only"`, `scripts/**`

**`guard:no-notion-runtime`**:
- Ensures `@notionhq/client` is not used in runtime code
- Allowed locations: `scripts/**`, `lib/importers/**`

**`guard:user-id-uuid`**:
- Verifies all core tables have `user_id` column of type `uuid`
- Uses RPC `guard_user_id_types()` if available, falls back to `information_schema`
- Checks: `crm_contacts`, `tasks`, `deals`, `habits`, `habit_logs`, `journal_entries`

### Fixing Common Guard Failures

**Service Role Guard Failures**:

1. **"Imports lib/supabase/admin outside server-only contexts"**:
   - Add `import "server-only";` at top of file
   - Or move import to API route

2. **"Found SUPABASE_SERVICE_ROLE_KEY reference"**:
   - Replace direct env var usage with `supabaseAdmin` from `@/lib/supabase/admin`
   - Exception: `lib/supabase/admin.ts` itself (where it's defined)

**Notion Runtime Guard Failures**:

1. **"Notion usage found in runtime code"**:
   - Move Notion code to `scripts/` or `lib/importers/`
   - Or mark file as deprecated/removed

**UUID user_id Guard Failures**:

1. **"missing user_id column"**:
   - Run migration to add `user_id uuid` column
   - Ensure FK to `public.users(id)`

2. **"user_id is {type} (expected uuid)"**:
   - Run migration to alter column type to `uuid`
   - Backfill data if needed

3. **"cannot query schema information"**:
   - Ensure RPC `guard_user_id_types()` exists (run migration)
   - Or grant access to `information_schema` (if using fallback)

---

## Quick Reference

### Common SQL Queries

**Check user's data**:
```sql
SELECT 'tasks' as table_name, COUNT(*) as count FROM tasks WHERE user_id = 'uuid'
UNION ALL
SELECT 'deals', COUNT(*) FROM deals WHERE user_id = 'uuid'
UNION ALL
SELECT 'contacts', COUNT(*) FROM crm_contacts WHERE user_id = 'uuid';
```

**Recent audit log**:
```sql
SELECT action_type, entity_type, source, created_at
FROM audit_log
WHERE user_id = 'uuid'
ORDER BY created_at DESC
LIMIT 50;
```

**Job system status**:
```sql
SELECT status, COUNT(*) as count
FROM job_queue
GROUP BY status;
```

### Environment Variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLERK_SECRET_KEY` (for auth)

Optional:
- `NODE_ENV` (production/development)

### Key Endpoints

- `/api/health/db` - Database health
- `/api/health/rls` - RLS health
- `/api/cron/tick` - Cron entry point
- `/api/jobs/dispatch` - Claim jobs
- `/api/jobs/execute` - Execute job
- `/api/automation/scan` - Trigger autopilot
- `/api/agents/run` - Run agent
- `/autopilot/command-center` - Admin UI

---

**Last Updated**: Sprint 4.1B

