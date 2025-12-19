# Golden Path SLA Escalation 404 Fix

## Problem
The SLA Escalation scenario in `/admin/scheduler/golden-path` was returning a 404 error.

## Root Cause Analysis

1. **Initial Investigation**: The golden path route (`app/api/admin/scheduler/golden-path/route.ts`) had a comment saying "Run health tick (which triggers SLA escalation)" but was directly calling Supabase RPCs instead of calling the health tick endpoint.

2. **Missing Route**: While `/api/scheduler/run-health` exists, the golden path route was not using it. If it had tried to fetch it, it would have failed because:
   - Server-side routes can't easily call their own endpoints via HTTP
   - Authentication headers wouldn't pass through
   - The endpoint path might not be resolvable in serverless environments

3. **Auth Mismatch**: The `/api/scheduler/run-health` route was using the old `requireAdmin()` instead of the new `requireAdminClerkUserId()`.

## Solution

### 1. Created Shared Health Tick Function
**File**: `lib/jobs/health-tick.ts`

Extracted the health tick logic into a reusable function that:
- Computes job queue health snapshot
- Runs SLA escalation
- Runs provider health tick (C10)
- Returns structured results

### 2. Updated `/api/scheduler/run-health` Route
**File**: `app/api/scheduler/run-health/route.ts`

- Updated to use `requireAdminClerkUserId()` (new admin gate)
- Now calls the shared `runSchedulerHealthTick()` function
- Returns structured response with component status

### 3. Updated Golden Path Route
**File**: `app/api/admin/scheduler/golden-path/route.ts`

- Updated SLA escalation scenario to use the shared `runSchedulerHealthTick()` function
- No longer attempts HTTP fetch (which was unreliable)
- Directly imports and calls the function (more efficient and reliable)

### 4. Created Route Registry
**File**: `docs/admin-route-registry.md`

Documentation of all admin routes, their auth requirements, payloads, and consumers.

## Files Changed

1. ✅ `lib/jobs/health-tick.ts` (NEW) - Shared health tick function
2. ✅ `app/api/scheduler/run-health/route.ts` - Updated to use shared function + new auth
3. ✅ `app/api/admin/scheduler/golden-path/route.ts` - Updated SLA scenario to use shared function
4. ✅ `docs/admin-route-registry.md` (NEW) - Route documentation
5. ✅ `docs/GOLDEN_PATH_404_FIX.md` (NEW) - This document

## Verification Steps

1. **Restart dev server**:
   ```powershell
   Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
   npm run dev
   ```

2. **Test Golden Path**:
   - Navigate to `/admin/scheduler/golden-path`
   - Click "SLA Escalation" button
   - Should now pass (no 404)

3. **Test Health Tick Endpoint**:
   ```powershell
   # Should return 200 OK (if admin) or 403 (if not admin)
   Invoke-WebRequest -Uri "http://localhost:3000/api/scheduler/run-health" -Method POST -Headers @{"Content-Type"="application/json"}
   ```

## Benefits

1. **No More 404s**: Direct function calls instead of HTTP fetches
2. **Better Performance**: No HTTP overhead for internal calls
3. **Consistent Logic**: Both routes use the same function
4. **Better Auth**: All routes use the new centralized admin gate
5. **Maintainability**: Logic is centralized in one place

## Notes

- The `/api/scheduler/run-health` endpoint still exists and works for external calls (e.g., from cron jobs)
- The golden path route now uses the shared function directly, which is more reliable
- Both approaches are valid - use HTTP for external calls, use shared functions for internal calls

