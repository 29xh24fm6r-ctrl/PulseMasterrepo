# Sprint 4.3: Autopilot Setup Guide

## ✅ Implementation Complete

The Autopilot system has been fully refactored to use DB-aligned tables:
- **Policies**: `plugin_automations`
- **Runs**: `life_arc_autopilot_runs`
- **Suggestions**: `life_arc_autopilot_suggestions`

## 🚀 Setup Steps

### 1. Run Migration

Apply the migration in Supabase:
```sql
-- File: supabase/migrations/20251216_sprint4_3_life_arc_autopilot_suggestions.sql
```

This creates:
- `life_arc_autopilot_suggestions` table
- Adds `owner_user_id` to `life_arc_autopilot_runs` (if missing)
- Adds `owner_user_id` to `plugin_automations` (if missing)
- Sets up RLS policies

### 2. Create Starter Policies

Insert two policies into `plugin_automations` (via Supabase Table Editor or SQL):

#### Overdue Tasks Policy

```sql
INSERT INTO plugin_automations (
  user_id,           -- UUID from public.users.id
  owner_user_id,     -- Your Clerk user ID (text)
  name,
  description,
  trigger_event,
  action_type,
  trigger_conditions,
  action_config,
  is_active
) VALUES (
  '<your_supabase_user_uuid>',
  '<your_clerk_user_id>',
  'Overdue Tasks Detector',
  'Detects tasks that are overdue and suggests prioritizing them',
  'autopilot.scan',
  'suggest',
  '{"overdue_days": 1, "max_results": 25}'::jsonb,
  '{"detector": "overdue_tasks"}'::jsonb,
  true
);
```

#### Stale Deals Policy

```sql
INSERT INTO plugin_automations (
  user_id,
  owner_user_id,
  name,
  description,
  trigger_event,
  action_type,
  trigger_conditions,
  action_config,
  is_active
) VALUES (
  '<your_supabase_user_uuid>',
  '<your_clerk_user_id>',
  'Stale Deals Detector',
  'Detects deals with no activity and suggests following up',
  'autopilot.scan',
  'suggest',
  '{"stale_days": 7, "max_results": 25}'::jsonb,
  '{"detector": "stale_deals"}'::jsonb,
  true
);
```

### 3. Test the System

1. **Trigger a scan**:
   ```bash
   POST /api/autopilot/scan
   Body: { "scopes": ["tasks", "deals"] }
   ```

2. **Wait for cron tick** (or manually execute the job):
   ```bash
   POST /api/jobs/execute
   Body: { "job_id": "<job_id_from_scan>" }
   ```

3. **View suggestions**:
   - Navigate to `/autopilot/suggestions`
   - Or call `GET /api/autopilot/suggestions?status=open`

## 🔒 Critical Requirements

### Payload Must Include `owner_user_id`

The scan handler **requires** `owner_user_id` (Clerk user ID) in the job payload. Without it, the scan will skip with:
```json
{
  "skipped": true,
  "reason": "missing_clerk_user_id",
  "suggestions_created": 0
}
```

The `/api/autopilot/scan` endpoint now includes this automatically.

### Policy Filtering

Policies are loaded using:
- `owner_user_id = clerkUserId` (primary filter)
- `trigger_event = 'autopilot.scan'`
- `action_type = 'suggest'`
- `is_active = true`

## 📊 How It Works

1. **Scan Triggered**: User calls `/api/autopilot/scan`
2. **Job Enqueued**: Job includes `owner_user_id` in payload
3. **Handler Executes**:
   - Creates `life_arc_autopilot_runs` record
   - Loads active policies from `plugin_automations`
   - Runs detectors (overdue_tasks, stale_deals)
   - Inserts suggestions with idempotency handling
4. **Lifecycle Safety**:
   - Dismissed suggestions stay dismissed
   - Snoozed suggestions re-open when expired
   - Duplicate suggestions are deduped

## 🧪 Acceptance Tests

### Test 1: No Active Policies
- Result: Scan creates run with `skipped_reason: "no_active_policies"`
- Creates 0 suggestions

### Test 2: Active Policy
- Result: Scan creates suggestions
- Re-running scan creates 0 duplicates (idempotency)

### Test 3: Dismiss
- Result: Suggestion disappears
- Re-running scan does NOT resurrect it

### Test 4: Snooze
- Result: Suggestion hidden until expiry
- After expiry, next scan re-opens it

## 📝 Policy Configuration

### Trigger Conditions (JSON)
```json
{
  "overdue_days": 1,      // For overdue_tasks detector
  "stale_days": 7,        // For stale_deals detector
  "max_results": 25       // Max suggestions per detector
}
```

### Action Config (JSON)
```json
{
  "detector": "overdue_tasks"  // or "stale_deals"
}
```

## 🔍 Troubleshooting

### Scan Always Skips
- **Check**: Does `plugin_automations` have `owner_user_id` column?
- **Check**: Are policies `is_active = true`?
- **Check**: Do policies have `trigger_event = 'autopilot.scan'` and `action_type = 'suggest'`?

### No Suggestions Created
- **Check**: Are there actually overdue tasks or stale deals?
- **Check**: Do policies have correct `action_config.detector` values?
- **Check**: Are `trigger_conditions` set correctly?

### Suggestions Reappear After Dismiss
- **Check**: Is the idempotency key stable? (Should include policy ID and entity ID)
- **Check**: Is the suggestion actually being dismissed (status = 'dismissed')?

## 📚 Related Files

- `lib/server/jobs/handlers/autopilotScan.ts` - Main handler
- `lib/server/autopilot/detectors.ts` - Detector functions (if separate)
- `app/api/autopilot/scan/route.ts` - Scan trigger endpoint
- `app/api/autopilot/suggestions/route.ts` - Fetch suggestions
- `app/autopilot/suggestions/page.tsx` - UI

