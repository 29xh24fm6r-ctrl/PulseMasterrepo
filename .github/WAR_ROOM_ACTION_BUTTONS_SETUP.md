# War Room Action Buttons Setup Guide

## Required Secrets & Environment Variables

### Vercel/Deployment Environment Variables

Add these to your hosting platform (Vercel, etc.):

1. **`WAR_ROOM_ADMIN_TOKEN`**
   - Long random string (e.g., generate with: `openssl rand -hex 32`)
   - Used to authenticate War Room button actions
   - **Store this securely** - operators will paste it into the War Room UI

2. **`GITHUB_ACTIONS_PAT`**
   - GitHub Personal Access Token with:
     - `repo` scope (for private repos) or public repo access
     - `workflow` scope (to dispatch workflows)
   - Create at: https://github.com/settings/tokens
   - **Store this securely** - never commit to git

3. **`GITHUB_OWNER`**
   - Your GitHub organization or username
   - Example: `YourOrg` or `yourusername`

4. **`GITHUB_REPO`**
   - Your repository name
   - Example: `pulse-os-dashboard-main`

5. **`GITHUB_PROD_SMOKE_WORKFLOW_FILE`**
   - The filename of your prod smoke workflow
   - Example: `sentinel-rollback.yml`

6. **`GITHUB_AUTO_ROLLBACK_WORKFLOW_FILE`**
   - The filename of your auto-rollback workflow
   - Example: `auto-rollback-pr.yml`

### GitHub Actions Secrets

Add to your GitHub repository (Settings → Secrets and variables → Actions):

1. **`OPS_WAR_ROOM_STATUS_URL`**
   - Your deployed status endpoint URL
   - Example: `https://your-domain.com/api/ops/incidents/status`
   - Used by the rollback auto-merge workflow to check freeze state

## Database Migration

Run the Supabase migration:

1. Open Supabase Dashboard → SQL Editor
2. Copy the contents of `supabase/migrations/20251219_ops_automation_locks.sql`
3. Paste and execute

This creates:
- `ops_automation_locks` table (for freeze latch)
- Seeds the `rollback_auto_merge` lock key
- RLS policies (authenticated users can read, service role can write)

## Testing the Action Buttons

1. **Get your admin token**:
   - Copy `WAR_ROOM_ADMIN_TOKEN` from your Vercel env vars
   - Paste it into the "Admin Token" field in the War Room UI

2. **Test "Run Smoke Now"**:
   - Click the button
   - Check GitHub Actions - you should see a new workflow run
   - Check the War Room timeline - you should see `operator_dispatched_smoke` event

3. **Test "Freeze Auto-Merge"**:
   - Click "Freeze Auto-Merge"
   - Enter a reason (optional)
   - You should see the freeze banner appear
   - Check the timeline - you should see `operator_freeze_enabled` event
   - Try to trigger a rollback auto-merge - it should be blocked

4. **Test "Generate Rollback PR Now"**:
   - Click the button
   - Check GitHub Actions - you should see the auto-rollback workflow run
   - Check the timeline - you should see `operator_dispatched_auto_rollback` event

5. **Test "Create Postmortem Draft"**:
   - Click the button
   - Check GitHub - a new PR should be created with the postmortem markdown
   - Check the timeline - you should see `postmortem_pr_created` event
   - The PR will contain a markdown doc in `docs/postmortems/YYYY-MM-DD-incident-<id>.md`

## How the Freeze Latch Works

1. **Operator enables freeze** via War Room button
2. **Freeze state stored** in `ops_automation_locks` table
3. **Rollback auto-merge workflow checks** freeze state before merging
4. **If frozen**, workflow exits early with error
5. **Operator disables freeze** when ready to resume auto-merge

The freeze check happens **before** any merge logic, ensuring a hard stop.

## Security Notes

- **Admin token is stored client-side** (localStorage) for now
- **Replace with Clerk role-based auth** for production
- **GitHub PAT should be scoped** to minimum required permissions
- **All actions are audited** in `ops_incident_events` table

## Troubleshooting

- **"unauthorized" errors**: Check that `WAR_ROOM_ADMIN_TOKEN` matches in both Vercel and the UI
- **"missing_env" errors**: Verify all GitHub env vars are set correctly
- **"github_dispatch_failed"**: Check that `GITHUB_ACTIONS_PAT` has `workflow` scope
- **Freeze not working**: Verify `OPS_WAR_ROOM_STATUS_URL` is set in GitHub Actions secrets
- **Database errors**: Ensure the automation locks migration ran successfully

## Postmortem Bot + Diff Lens

The "Create Postmortem Draft" button:
- Pulls the last 200 events from `ops_incident_events`
- Identifies the incident window (from `smoke_failed` or last 2 hours)
- **Builds Diff Lens evidence** (suspect SHA, compare, changed files, PR link)
- Builds a structured markdown postmortem with evidence embedded
- Creates a branch `postmortem/auto-YYYY-MM-DD-inc-<id>`
- Commits the doc to `docs/postmortems/YYYY-MM-DD-incident-<id>.md`
- Opens a PR to `main`
- Emits `diff_lens_built` and `postmortem_pr_created` events to the War Room timeline

The postmortem includes:
- Incident metadata (ID, date, window, suspected change SHA)
- Summary template
- Impact section
- Detection details
- **Diff Lens (Evidence) section** with:
  - Suspect SHA + parent SHA
  - Suspect PR link (if resolvable)
  - GitHub compare link
  - List of changed files with +/- stats
- Root cause section (guided by Diff Lens evidence)
- Resolution section (with rollback details)
- Full timeline of events
- Action items table
- Links to related PRs/runs/compares

### Diff Lens Permissions

`GITHUB_ACTIONS_PAT` must have permissions to:
- Read commits (to find parent SHA)
- Read compare (to build diff)
- Read commit→pulls (to resolve PR link)
- Create branches/contents (for PR creation)
- Open PRs

## Next Steps

- Replace client-side token storage with Clerk role-based auth
- Add operator name/email to freeze records
- Add freeze expiration (auto-disable after X hours)
- Add freeze history/audit log
- Auto-trigger postmortem after rollback merge (optional)
- Add "Diff Lens" to find the exact PR/commit that caused the failure

