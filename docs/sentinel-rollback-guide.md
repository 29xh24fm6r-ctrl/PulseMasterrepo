# Sentinel Rollback System - Human Override Guide

## Overview

The Sentinel Rollback system automatically creates revert PRs when production smoke tests fail, and can auto-merge them when smoke tests pass again. This guide explains how to override or control the system.

## Safety Controls

### Stop Auto-Merge

To prevent a rollback PR from auto-merging:

1. **Remove `canary-green` label** - The auto-merge workflow requires both `rollback` and `canary-green` labels. Removing `canary-green` will stop auto-merge.

2. **Close the PR** - Closing the PR will prevent any auto-merge attempts.

3. **Add a blocking label** - You can add any custom label and modify the auto-merge workflow to skip PRs with that label.

### Manual Override

If you need to merge a rollback PR manually:

1. Ensure the PR has `rollback` and `canary-green` labels
2. Verify all checks are passing
3. Merge manually via GitHub UI or CLI

### Additional Safety Gate (Optional)

If you want an extra approval step, you can:

1. Add a new label: `rollback-approved`
2. Modify `.github/workflows/rollback-auto-merge.yml` to also require this label
3. Only add `rollback-approved` when you're ready for auto-merge

## Workflow States

### Rollback PR Lifecycle

1. **Created** - Production smoke fails → rollback PR created with `rollback` label
2. **Canary Preview** - Preview deployed, smoke tests run
3. **Canary Green** - Smoke passes → `canary-green` label added
4. **Auto-Merge Ready** - Both labels present + checks green → auto-merge enabled
5. **Merged** - PR merged automatically (or manually)

### Label States

- `rollback` - Identifies this as a rollback PR (required for auto-merge)
- `canary-green` - Indicates preview smoke tests passed (required for auto-merge)
- `canary-failed` - Indicates preview smoke tests failed (blocks auto-merge)
- `rollback-approved` - Optional human approval gate (if implemented)

## Troubleshooting

### PR Not Auto-Merging

Check:
- ✅ Has `rollback` label
- ✅ Has `canary-green` label
- ✅ All checks are passing
- ✅ PR is mergeable (no conflicts)
- ✅ Branch name matches pattern (`rollback/*`, `revert/*`)
- ✅ Not a draft
- ✅ Auto-merge is enabled in repo settings

### Production Smoke Failing

1. Check the Actions logs for `sentinel-rollback` workflow
2. Review the smoke test output in `scripts/sentinel/prod-smoke.mjs`
3. Verify `PROD_URL` secret is set correctly
4. Check production health endpoint: `{PROD_URL}/api/health/db`

### Rollback PR Not Created

Check:
- Production smoke actually failed (check Actions logs)
- `PROD_URL` secret is set
- Rollback script has permissions (check Actions logs)
- No conflicts in git revert (check Actions logs)

## Manual Commands

### Label a PR manually

```bash
gh pr edit <PR_NUMBER> --add-label "canary-green"
gh pr edit <PR_NUMBER> --add-label "rollback"
```

### Remove canary-green to stop auto-merge

```bash
gh pr edit <PR_NUMBER> --remove-label "canary-green"
```

### Create rollback PR manually

```bash
# If you need to create a rollback PR manually
node scripts/sentinel/rollback.mjs
```

## Configuration

### Environment Variables

- `PROD_URL` - Production URL for smoke tests (required)
- `ROLLBACK_BRANCH_PREFIX` - Branch prefix (default: `revert/prod`)
- `ROLLBACK_PICK_SENTINEL_ONLY` - Prefer sentinel commits (default: `true`)
- `ROLLBACK_GATE` - Build command (default: `npm run build`)

### GitHub Settings

Required:
- Settings → General → Pull Requests → **Allow auto-merge** = ON
- Branch protection on `main` with required checks

## Best Practices

1. **Monitor rollback PRs** - Review them before they auto-merge
2. **Test rollback locally** - Verify the revert works as expected
3. **Document rollbacks** - Add comments explaining why rollback was needed
4. **Follow up** - After rollback, investigate root cause and create proper fix

