# Production Deployment Guide

## Overview

Production deployments are locked behind **GitHub Environments** with required approvals, ensuring safe and controlled releases.

## GitHub Environments Setup

### Step 1: Create Environments (One-time, GitHub UI)

1. Go to: **Repository → Settings → Environments**
2. Click **"New environment"**
3. Create:
   - `production` - Production deployments
   - `staging` (optional) - Staging deployments

### Step 2: Configure Production Environment

For `production` environment:

- ✅ **Required reviewers** - Add yourself (or team members)
- ✅ **Deployment branches** - Select "Only selected branches" → `main`
- ✅ **Environment secrets** - Add:
  - `PROD_DEPLOY_HOOK_URL` (recommended) - Vercel deploy hook URL
  - OR `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (CLI method)

### Step 3: Configure Staging Environment (Optional)

For `staging` environment:

- ✅ **Required reviewers** - Optional (can be auto-approved)
- ✅ **Deployment branches** - `develop` or `staging`
- ✅ **Environment secrets** - Add:
  - `STAGING_DEPLOY_HOOK_URL` (recommended)

## Vercel Deploy Hook Setup (Recommended)

### Get Deploy Hook URL

1. Go to: **Vercel Dashboard → Your Project → Settings → Git**
2. Scroll to **"Deploy Hooks"**
3. Click **"Create Hook"**
4. Configure:
   - **Name**: `production-deploy` (or `staging-deploy`)
   - **Branch**: `main` (or `develop`/`staging`)
5. Copy the hook URL

### Add to GitHub Secrets

1. Go to: **Repository → Settings → Environments → `production`**
2. Click **"Add secret"**
3. Name: `PROD_DEPLOY_HOOK_URL`
4. Value: Paste the hook URL from Vercel
5. Save

Repeat for `staging` if using staging environment.

## Deployment Workflows

### Production Deployment

**File:** `.github/workflows/deploy-production.yml`

**Triggers:**
- Push to `main` branch
- Manual workflow dispatch

**Steps:**
1. Checkout code
2. Install dependencies
3. Run guards + typecheck + lint (extra safety)
4. Trigger Vercel deploy hook (or CLI deploy)

**Environment:** `production` (requires approval)

### Staging Deployment

**File:** `.github/workflows/deploy-staging.yml`

**Triggers:**
- Push to `develop` or `staging` branch
- Manual workflow dispatch

**Steps:** Same as production

**Environment:** `staging` (optional approval)

## Deployment Process

### Automatic (on push to main)

1. Developer pushes to `main`
2. CI runs (sentinel + guards + build)
3. If CI passes, deploy workflow triggers
4. GitHub shows pending approval (if configured)
5. Reviewer approves in GitHub UI
6. Deployment executes
7. Vercel receives deploy hook and builds/deploys

### Manual (workflow dispatch)

1. Go to: **Actions → Deploy Production** (or Deploy Staging)
2. Click **"Run workflow"**
3. Select branch (usually `main`)
4. Click **"Run workflow"**
5. Approve if required
6. Deployment executes

## Safety Checks

Before deployment, the workflow runs:

- ✅ `guard:no-internal-http` - No internal HTTP violations
- ✅ `contracts:check` - Contract infrastructure present
- ✅ `typecheck` - TypeScript compiles
- ✅ `lint` - Code quality (warnings allowed)

These run **again** in the deploy workflow as an extra safety net, even though CI already passed.

## Troubleshooting

### Deployment Not Triggering

- Check branch name matches workflow trigger (`main` for production)
- Verify workflow file exists in `.github/workflows/`
- Check Actions tab for workflow runs

### Approval Not Required

- Verify environment is configured in GitHub Settings → Environments
- Check "Required reviewers" is set
- Ensure workflow uses `environment: production`

### Deploy Hook Not Working

- Verify `PROD_DEPLOY_HOOK_URL` secret is set in environment
- Check hook URL is correct (from Vercel dashboard)
- Verify hook is enabled in Vercel
- Check Vercel logs for hook receipt

### Fallback to CLI

If deploy hook fails, the workflow falls back to Vercel CLI method (requires `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`).

## Best Practices

1. **Always test in staging first** - Deploy to staging before production
2. **Review before approving** - Check CI status and changes before approving
3. **Monitor deployments** - Watch Vercel dashboard during deployment
4. **Keep secrets secure** - Never commit deploy hooks or tokens
5. **Use concurrency control** - Workflows use `concurrency` to prevent duplicate deploys

## Status

- ✅ Production deploy workflow configured
- ✅ Staging deploy workflow configured (optional)
- ✅ Safety checks in place
- ⚠️ Manual: Configure GitHub environments and secrets

