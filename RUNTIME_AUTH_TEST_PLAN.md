# Runtime Authentication Test Plan

## CRITICAL: Manual Testing Checklist (Run Before Each Deploy)

### Test 1: Apex → WWW Redirect
**Goal**: Verify platform-level redirect works

1. Open Chrome DevTools (F12) → Network tab
2. Visit `https://pulselifeos.com/` directly
3. **PASS CRITERIA**:
   - Browser URL becomes `https://www.pulselifeos.com/`
   - Network shows 308 redirect
   - No Clerk errors in console

### Test 2: Authenticated Runtime API Access
**Goal**: Verify signed-in users can access runtime endpoints

1. Sign in to `https://www.pulselifeos.com/`
2. Open DevTools → Console
3. Run:
   ```javascript
   Promise.all([
     fetch('/api/runtime/home').then(r => r.json()),
     fetch('/api/runtime/state').then(r => r.json()),
     fetch('/api/runtime/bridge', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({text:'test'})}).then(r => r.json()),
     fetch('/api/runtime/observer').then(r => r.json()),
     fetch('/api/runtime/plan').then(r => r.json())
   ]).then(results => {
     console.log('✅ All runtime endpoints:', results);
     const has401 = results.some(r => r.error && r.error.includes('identity'));
     if (has401) console.error('❌ FAIL: 401 detected');
     else console.log('✅ PASS: All endpoints returned data');
   })
   ```
4. **PASS CRITERIA**:
   - All 5 endpoints return 200
   - No "User identity missing" errors
   - No 401 responses
   - Console logs show `requireUserId` resolution

### Test 3: Preview Mode (Vercel Preview Deployments)
**Goal**: Verify preview deployments work without Clerk

1. Deploy to Vercel preview
2. Visit preview URL
3. **PASS CRITERIA**:
   - No Clerk errors in console
   - Runtime endpoints return preview data
   - No 401 errors
   - Banner shows "PREVIEW SAFE MODE — Read Only"

### Test 4: Identity Source Fallback
**Goal**: Verify requireUserId falls back to headers when needed

1. Sign in to `https://www.pulselifeos.com/`
2. Open DevTools → Console
3. **PASS CRITERIA**:
   - Console shows `[requireUserId] Resolved from Clerk auth()`
   - NOT `[requireUserId] Resolved from header injection`
   - This confirms primary auth path is working

### Test 5: Error Handling
**Goal**: Verify graceful degradation

1. Sign out
2. Try to visit `/` (should redirect to `/sign-in`)
3. **PASS CRITERIA**:
   - No React crashes
   - No infinite redirect loops
   - Runtime goes to 'paused' mode
   - No error spam in console

---

## Automated E2E Test Setup (Recommended)

Run these commands to set up Playwright:

```bash
npm install -D @playwright/test
npx playwright install chromium
```

Then create `tests/runtime-auth.spec.ts` (see below).

---

## Quick Smoke Test (Run After Each Deploy)

1. Sign in: `https://www.pulselifeos.com/sign-in`
2. Open DevTools Console
3. Paste:
   ```javascript
   // Runtime smoke test
   fetch('/api/runtime/home')
     .then(r => r.json())
     .then(data => {
       if (data.error) console.error('❌ FAIL:', data.error);
       else console.log('✅ PASS: Runtime working', data);
     })
   ```
4. If you see `✅ PASS`, deployment is good

---

## What to Look For (Red Flags)

🚨 **IMMEDIATE ROLLBACK** if you see:
- `User identity missing` error
- 401 status on `/api/runtime/*`
- `[ClerkProvider] Disabling Auth` on www subdomain
- Infinite redirect loops
- React error #418

🔍 **INVESTIGATE** if you see:
- `[requireUserId] Resolved from header injection` on www (should use Clerk auth())
- Any 401s in Network tab
- Missing `x-pulse-runtime-auth` header

---

## Contact

If any test fails, check:
1. Is `vercel.json` redirect deployed?
2. Is `requireUserId` using `await auth()` first?
3. Is Clerk configured for www.pulselifeos.com?
4. Are preview deployments bypassing Clerk via CLERK_DISABLED?
