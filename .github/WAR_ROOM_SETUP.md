# War Room Setup Guide

## Required Secrets

### GitHub Actions Secrets

In your GitHub repository, go to **Settings → Secrets and variables → Actions** and add:

1. **`OPS_EVENTS_TOKEN`**
   - A long random string (e.g., generate with: `openssl rand -hex 32`)
   - Used to authenticate GitHub Actions when posting events to the War Room

2. **`OPS_EVENTS_INGEST_URL`**
   - Your deployed endpoint URL: `https://YOUR_DOMAIN/api/ops/incidents/event`
   - Example: `https://pulse-os.vercel.app/api/ops/incidents/event`

### Vercel/Deployment Environment Variables

In your Vercel project settings (or your hosting platform), add:

1. **`OPS_EVENTS_TOKEN`**
   - **Must match** the value in GitHub Actions secrets
   - Used by the `/api/ops/incidents/event` endpoint to verify requests

## Database Migration

Run the Supabase migration:

1. Open Supabase Dashboard → SQL Editor
2. Copy the contents of `supabase/migrations/20251219_ops_incident_war_room.sql`
3. Paste and execute

This creates:
- `ops_incidents` table (for grouping incidents)
- `ops_incident_events` table (timeline feed)
- Indexes for performance
- RLS policies (authenticated users can read, service role can write)

## Testing

1. **Test the ingest endpoint** (from GitHub Actions or curl):
   ```bash
   curl -X POST "https://YOUR_DOMAIN/api/ops/incidents/event" \
     -H "content-type: application/json" \
     -H "x-ops-token: YOUR_TOKEN" \
     -d '{
       "source": "app",
       "event_type": "test_event",
       "level": "info",
       "summary": "Test event from War Room setup"
     }'
   ```

2. **View the War Room**:
   - Navigate to `/ops/incidents` in your app
   - You should see the timeline with your test event

3. **Trigger a real event**:
   - Cause a prod smoke failure (or wait for one)
   - The auto-rollback workflow will emit events
   - Check the War Room timeline to see them appear

## Event Flow

1. **Prod smoke fails** → `smoke_failed` event
2. **Rollback PR created** → `rollback_pr_created` event
3. **Smoke dispatched** → `smoke_dispatched_for_rollback` event
4. **Smoke passes** → `smoke_passed` event
5. **Canary green applied** → `canary_green_applied` event
6. **Rollback merged** → `rollback_merged` event

All events appear in the War Room timeline with links, timestamps, and metadata.

## Troubleshooting

- **Events not appearing**: Check that `OPS_EVENTS_TOKEN` matches in both GitHub and Vercel
- **401 Unauthorized**: Verify the token is set correctly and the header is `x-ops-token`
- **Database errors**: Ensure the migration ran successfully in Supabase
- **RLS blocking writes**: The ingest endpoint uses `supabaseAdmin()` (service role), so RLS shouldn't block it

