# Autopilot Debug Quick Start

## ✅ Debug Logs Added

Debug logs have been added to help you:
1. Confirm your Clerk user ID
2. Verify policy loading
3. Track scan execution

## 🚀 Step-by-Step Instructions

### Step 1: Trigger Scan Endpoint

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Call the scan endpoint:
   ```bash
   POST http://localhost:3000/api/autopilot/scan
   Body: {}
   ```

   Or use curl:
   ```bash
   curl -X POST http://localhost:3000/api/autopilot/scan \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

### Step 2: Check Terminal Logs

You should see:
```
AUTOPILOT SCAN USER { clerkUserId: 'user_XXXX', supabaseUserId: 'uuid-XXXX' }
```

**Copy the `clerkUserId` value** (e.g., `user_abc123xyz`).

### Step 3: Update Policy Ownership

In Supabase Table Editor or SQL Editor:

1. Open `plugin_automations` table
2. Find rows where:
   - `trigger_event = 'autopilot.scan'`
   - `action_type = 'suggest'`
3. Update each row:
   - Set `owner_user_id` = your Clerk user ID (from Step 2)
   - Set `user_id` = your Supabase UUID (from Step 2)

**SQL Example**:
```sql
UPDATE plugin_automations
SET 
  owner_user_id = 'user_YOUR_CLERK_ID_HERE',
  user_id = 'YOUR_SUPABASE_UUID_HERE'
WHERE 
  trigger_event = 'autopilot.scan' 
  AND action_type = 'suggest';
```

### Step 4: Execute the Job

After triggering the scan, you'll get a `job_id`. Execute it:

**Option A: Via API** (requires service role auth):
```bash
POST http://localhost:3000/api/jobs/execute
Body: { "job_id": "uuid-from-scan-response" }
```

**Option B: Wait for cron** (if cron is set up)

**Option C: Manual SQL** (for testing):
```sql
-- Get the job ID from job_queue
SELECT id, status, payload 
FROM job_queue 
WHERE job_type = 'autopilot.scan' 
ORDER BY created_at DESC 
LIMIT 1;
```

### Step 5: Check Handler Logs

When the job executes, you should see:
```
AUTOPILOT SCAN HANDLER { supabaseUserId: '...', clerkUserId: '...', correlationId: '...' }
AUTOPILOT SCAN: Loading policies { clerkUserId: '...', ... }
AUTOPILOT SCAN: Policies found { count: 2, policies: [...], error: null }
AUTOPILOT SCAN: Completed { run_id: '...', suggestions_created: 5, ... }
```

### Step 6: Verify Results

**Check in Supabase**:
1. `life_arc_autopilot_runs` - Should have a new row
2. `life_arc_autopilot_suggestions` - Should have new rows

**Or via API**:
```bash
GET http://localhost:3000/api/autopilot/suggestions?status=open
```

## 🔍 Troubleshooting

### Issue: "AUTOPILOT SCAN: Policies found { count: 0 }"

**Fix**: 
- Check `owner_user_id` matches your Clerk user ID exactly
- Verify `is_active = true`
- Check `trigger_event = 'autopilot.scan'` and `action_type = 'suggest'`

### Issue: "Missing clerk user id; refusing to scan"

**Fix**: The scan endpoint should include `owner_user_id` automatically. Check that `resolveSupabaseUser()` is working.

### Issue: No suggestions created

**Check**:
- Do you have overdue tasks? (Check `tasks` table with `status = 'pending'` and `due_date < now()`)
- Do you have stale deals? (Check `deals` table with `status IN ('active', 'negotiating')` and `updated_at < now() - 7 days`)
- Check the run `details` JSON for error messages

## 📝 Next Steps

Once you see:
- ✅ Policies loading (count > 0)
- ✅ Run created successfully
- ✅ Suggestions created

You can remove the debug `console.log` statements and the system is production-ready!

