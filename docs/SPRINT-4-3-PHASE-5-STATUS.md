# Sprint 4.3 Phase 5: Policy Management UI + API - Status

## ✅ Completed

### API Endpoints
- ✅ `GET /api/autopilot/policies` - List all policies for current user
- ✅ `POST /api/autopilot/policies/[id]/toggle` - Enable/disable policy
- ✅ `POST /api/autopilot/policies/[id]/config` - Update policy configuration
- ✅ `POST /api/autopilot/settings` - Update global settings

### UI
- ✅ `app/autopilot/settings/page.tsx` - Policy management interface
  - List all policies with enabled/disabled state
  - Toggle enable/disable
  - Edit configuration (max_suggestions_per_day, scopes, rules)
  - JSON editors for complex config fields

### Security & Audit
- ✅ All endpoints use `resolveSupabaseUser()` for canonical auth
- ✅ RLS enforced: users can only access their own policies
- ✅ All changes audited to `audit_log` with:
  - `event_type`: `autopilot.policy_enabled`, `autopilot.policy_disabled`, `autopilot.policy_updated`, `autopilot.settings_updated`
  - `source`: `"ui"`
  - Deltas included in payload for config updates

## API Details

### GET /api/autopilot/policies
**Response:**
```json
{
  "ok": true,
  "policies": [
    {
      "id": "uuid",
      "name": "Tasks & Deals",
      "description": "...",
      "enabled": true,
      "scopes": ["tasks", "deals"],
      "max_suggestions_per_day": 50,
      "max_actions_per_day": 10,
      "requires_user_confirmation": true,
      "allowlist_rules": {},
      "denylist_rules": {},
      "safety_constraints": {},
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

### POST /api/autopilot/policies/[id]/toggle
**Body (optional):**
```json
{
  "enabled": true  // If omitted, toggles current state
}
```

**Response:**
```json
{
  "ok": true,
  "policy": { ... }
}
```

### POST /api/autopilot/policies/[id]/config
**Body:**
```json
{
  "max_suggestions_per_day": 50,
  "scopes": ["tasks", "deals"],
  "allowlist_rules": { ... },
  "denylist_rules": { ... },
  "safety_constraints": { ... },
  "name": "...",
  "description": "..."
}
```

**Response:**
```json
{
  "ok": true,
  "policy": { ... }
}
```

### POST /api/autopilot/settings
**Body:**
```json
{
  "max_suggestions_per_day": 50  // Global default
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Settings updated"
}
```

## Audit Log Events

All policy changes are logged with:
- `source: "ui"`
- `event_type`: One of:
  - `autopilot.policy_enabled`
  - `autopilot.policy_disabled`
  - `autopilot.policy_updated`
  - `autopilot.settings_updated`
- `entity_type`: `"automation_policy"` or `"user_settings"`
- `entity_id`: Policy ID (if applicable)
- `payload`: Includes deltas for updates, previous/new state for toggles

## Files Created

- `app/api/autopilot/policies/route.ts`
- `app/api/autopilot/policies/[id]/toggle/route.ts`
- `app/api/autopilot/policies/[id]/config/route.ts`
- `app/api/autopilot/settings/route.ts`
- `app/autopilot/settings/page.tsx`

## Next Steps (Remaining Phases)

- **Phase 6**: Scan Scheduling (Vercel Cron or Supabase Scheduled Trigger)
- **Phase 7**: More Detectors (Unanswered Emails, Stale Contacts, Renewals, Deal Risk)
- **Phase 8**: Suggestion Quality (Snooze, Grouping)
- **Phase 9**: Observability (Runs debug page)

## Testing

1. **List Policies**
   ```bash
   GET /api/autopilot/policies
   ```

2. **Toggle Policy**
   ```bash
   POST /api/autopilot/policies/<id>/toggle
   Body: { "enabled": true }
   ```

3. **Update Config**
   ```bash
   POST /api/autopilot/policies/<id>/config
   Body: { "max_suggestions_per_day": 100 }
   ```

4. **Verify Audit Log**
   ```sql
   SELECT * FROM audit_log 
   WHERE event_type LIKE 'autopilot.%' 
   ORDER BY created_at DESC;
   ```

