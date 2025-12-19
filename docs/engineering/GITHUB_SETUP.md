# GitHub Branch Protection Setup

## Required: Configure Branch Protection Rules

To ensure the guard actually blocks merges, you must configure GitHub branch protection rules.

## Steps

1. **Navigate to Repository Settings**
   - Go to your GitHub repository
   - Click `Settings` → `Branches`

2. **Add/Edit Branch Protection Rule**
   - Click `Add rule` or edit existing rule for `main` (and `master` if used)
   - Branch name pattern: `main` (or `main, master`)

3. **Enable Required Status Checks**
   - ✅ Check: **"Require status checks to pass before merging"**
   - ✅ Check: **"Require branches to be up to date before merging"** (recommended)

4. **Select Required Checks**
   From the list of available checks, select:
   - ✅ `sentinel / Guard: No internal HTTP between server routes`
   - ✅ `sentinel / TypeScript typecheck`
   - ✅ `guards / Guard: No internal HTTP between server routes`
   - ✅ `guards / Guard: No service role leakage`
   - ✅ `guards / Guard: UUID user_id enforcement`
   - ✅ `build / Build` (optional but recommended)

5. **Save Rule**

## Verification

After setup:

1. Create a test branch
2. Add a violation (e.g., `fetch("/api/...")` in a server route)
3. Push and create a PR
4. Verify the PR shows ❌ failing checks
5. Verify the merge button is disabled
6. Remove the violation
7. Verify checks pass and merge is enabled

## CI Workflow Jobs

The `.github/workflows/ci.yml` defines three jobs:

- **`sentinel`** - Fast-fail checks (guard + typecheck + lint)
- **`guards`** - Full guard suite
- **`build`** - Next.js build (depends on both above)

All jobs must pass for the PR to be mergeable (when branch protection is configured).

## Troubleshooting

**Checks not appearing:**
- Ensure workflow file is in `.github/workflows/ci.yml`
- Push a commit to trigger the workflow
- Check Actions tab to see if workflow ran

**Merge still allowed:**
- Verify branch protection rule is enabled
- Verify required checks are selected
- Verify workflow completed successfully

