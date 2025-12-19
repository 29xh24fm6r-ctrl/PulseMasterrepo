# Autopilot Setup & Debug Guide

## Step 1: Confirm Your Real Clerk User ID

### 1.1 Debug Log Added
✅ Added debug logs to:
- `app/api/autopilot/scan/route.ts` - Logs user identities when scan is triggered
- `lib/server/jobs/handlers/autopilotScan.ts` - Logs user identities and policy search

### 1.2 Trigger the Endpoint
1. Start your dev server: `npm run dev`
2. Call the endpoint:
   ```bash
   POST http://localhost:3000/api/autopilot/scan
   Body: {}
   ```
   Or use your browser/API client to trigger it.

### 1.3 Check Terminal Logs
You should see:
```
AUTOPILOT SCAN USER { clerkUserId: 'user_XXXX', supabaseUserId: 'uuid-XXXX' }
```

**Copy the exact `clerkUserId` value** (it will look like `user_...`).

## Step 2: Update Policy Ownership

### 2.1 Find Your Policies
In Supabase Table Editor, open `plugin_automations` and find rows where:
- `trigger_event = 'autopilot.scan'`
- `action_type = 'suggest'`

### 2.2 Update owner_user_id
For each policy row:
1. Set `owner_user_id` = your real Clerk user ID (from Step 1.3)
2. Set `user_id` = your Supabase user UUID (from Step 1.3)

**SQL Example** (replace with your actual IDs):
```sql
UPDATE plugin_automations
SET 
  owner_user_id = 'user_YOUR_CLERK_ID',
  user_id = 'YOUR_SUPABASE_UUID'
WHERE 
  trigger_event = 'autopilot.scan' 
  AND action_type = 'suggest';
```

## Step 3: Verify Policy Loading

### 3.1 Trigger Scan Again
After updating policies, trigger the scan again:
```bash
POST http://localhost:3000/api/autopilot/scan
```

### 3.2 Check Handler Logs
You should see in terminal:
```
AUTOPILOT SCAN HANDLER { supabaseUserId: '...', clerkUserId: '...', correlationId: '...' }
AUTOPILOT SCAN: Loading policies { clerkUserId: '...', ... }
AUTOPILOT SCAN: Policies found { count: 2, policies: [...], error: null }
```

If `count: 0`, check:
- Is `owner_user_id` set correctly?
- Is `is_active = true`?
- Are `trigger_event` and `action_type` correct?

## Step 4: Execute the Job

### 4.1 Get Job ID
After triggering scan, you'll get:
```json
{
  "ok": true,
  "job_id": "uuid-here",
  "correlation_id": "...",
  "scopes": ["tasks", "deals"]
}
```

### 4.2 Execute Job
Call the execute endpoint (or wait for cron):
```bash
POST http://localhost:3000/api/jobs/execute
Body: { "job_id": "uuid-from-step-4.1" }
```

**Note**: This requires service role authentication. You may need to:
- Use a service token in the Authorization header, OR
- Call it from a server-side script, OR
- Wait for the cron tick to process it automatically

### 4.3 Verify Results

Check in Supabase:
1. **life_arc_autopilot_runs**: Should have a new row with `status = 'success'`
2. **life_arc_autopilot_suggestions**: Should have new rows with `status = 'open'`

Or check via API:
```bash
GET http://localhost:3000/api/autopilot/suggestions?status=open
```

## Troubleshooting

### Issue: "Missing clerk user id; refusing to scan"
**Fix**: Ensure `owner_user_id` is in the job payload. The scan endpoint should include it automatically.

### Issue: Policies found count = 0
**Check**:
- `owner_user_id` matches your Clerk user ID exactly
- `is_active = true`
- `trigger_event = 'autopilot.scan'`
- `action_type = 'suggest'`

### Issue: No suggestions created
**Check**:
- Do you have overdue tasks or stale deals?
- Are the detector conditions met (e.g., `overdue_days: 1`)?
- Check the run `details` JSON for error messages

### Issue: Job execution fails
**Check**:
- Is the job in `job_queue` with `status = 'queued'`?
- Does the execute endpoint have service role auth?
- Check job `last_error` field for details

## Next Steps

Once you see:
- ✅ Policies loading (count > 0)
- ✅ Run created in `life_arc_autopilot_runs`
- ✅ Suggestions created in `life_arc_autopilot_suggestions`

You can remove the debug logs and the system is ready for production use!

