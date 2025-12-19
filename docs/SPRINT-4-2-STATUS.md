# Sprint 4.2: Autopilot v2 (Suggest-Only) + Audit Log - Status

## ✅ Completed

### Phase 1: SQL Schema
- ✅ Created `automation_suggestions` table (suggest-only, with idempotency)
- ✅ Updated `automation_policies` to include `max_suggestions_per_day`
- ✅ Updated `automation_runs` to include `detectors`, `suggestions_created`, `correlation_id`
- ✅ Updated `audit_log` to include `source` and `event_type` columns
- ✅ Added RLS policies for `automation_suggestions`
- ✅ Migration file: `supabase/migrations/20241216_sprint4_2_autopilot_suggestions.sql`

### Phase 2: Autopilot Scan Job Handler
- ✅ Created `lib/server/jobs/handlers/autopilotScan.ts`
- ✅ Implemented suggest-only flow:
  - Creates `automation_runs` record
  - Loads enabled policies
  - Skips if no policies enabled (bulletproof: no unexpected behavior)
  - Runs detectors (tasks: overdue, deals: stale)
  - Inserts suggestions with idempotency keys
  - Writes audit log entries
- ✅ Registered handler in `lib/server/jobs/registry.ts`

### Phase 3: API Endpoints
- ✅ `POST /api/autopilot/scan` - Trigger scan (enqueue job)
- ✅ `GET /api/autopilot/suggestions` - Fetch suggestions
- ✅ `POST /api/autopilot/suggestions/[id]/dismiss` - Dismiss suggestion

### Phase 4: Minimal UI
- ✅ Created `/autopilot/suggestions` page
- ✅ Displays suggestions with dismiss functionality
- ✅ Trigger scan button

## Key Features

### Suggest-Only Architecture
- **No automatic side effects**: All suggestions are stored, not executed
- **Idempotent**: Duplicate suggestions prevented via unique constraint
- **Policy-gated**: Only runs if user has enabled policies
- **Audited**: Every action logged to `audit_log`

### Detectors (v1 Minimal)
1. **Tasks Detector**: Finds overdue tasks, suggests prioritizing
2. **Deals Detector**: Finds stale deals (no activity in 7 days), suggests adding next step

### Safety Features
- Default mode = suggest-only
- No policies enabled = scan skipped (no unexpected behavior)
- Idempotency keys prevent duplicate suggestions
- All actions audited

## Database Schema

### `automation_suggestions`
- Stores suggested actions (not executed)
- Status: `suggested` | `dismissed` | `approved`
- Unique constraint on `(user_id, suggestion_type, idempotency_key)` where status = `suggested`

### `automation_runs`
- Tracks each scan execution
- Records detectors run, suggestions created
- Links to policies and correlation IDs

### `audit_log`
- Append-only log of all actions
- Includes `source`, `event_type`, `entity_type`, `entity_id`
- Enables replay and forensics

## Next Steps (Sprint 4.3)

1. **Approval Flow**: Add UI/API to approve suggestions → convert to actions
2. **Execution**: Implement action executors (create_task, nudge_deal, etc.)
3. **More Detectors**: Expand beyond tasks/deals
4. **Command Center Integration**: Show suggestions in admin UI

## Testing

### Manual Test Flow
1. Enable a policy (manually in DB for now):
   ```sql
   INSERT INTO automation_policies (user_id, name, enabled, scopes, max_suggestions_per_day)
   VALUES ('<user_id>', 'Tasks & Deals', true, ARRAY['tasks', 'deals'], 50);
   ```

2. Trigger scan:
   ```bash
   POST /api/autopilot/scan
   ```

3. Wait for cron tick to process job (or manually call `/api/jobs/execute`)

4. View suggestions:
   ```bash
   GET /api/autopilot/suggestions
   ```

5. Dismiss a suggestion:
   ```bash
   POST /api/autopilot/suggestions/<id>/dismiss
   ```

## Files Created/Modified

### New Files
- `supabase/migrations/20241216_sprint4_2_autopilot_suggestions.sql`
- `lib/server/jobs/handlers/autopilotScan.ts`
- `app/api/autopilot/scan/route.ts`
- `app/api/autopilot/suggestions/route.ts`
- `app/api/autopilot/suggestions/[id]/dismiss/route.ts`
- `app/autopilot/suggestions/page.tsx`

### Modified Files
- `lib/server/jobs/registry.ts` - Registered `autopilot.scan` handler

## Acceptance Criteria

✅ All app tables use `user_id uuid FK`  
✅ RLS policies in place  
✅ Suggest-only (no automatic execution)  
✅ Idempotent (duplicate prevention)  
✅ Audited (all actions logged)  
✅ Policy-gated (requires enabled policies)  
✅ API endpoints functional  
✅ Minimal UI created  

