# User Sync Fix - Complete ✅

## Problem
The `users` table has a **NOT NULL `clerk_user_id`** column, but the sync route was only upserting `clerk_id`. This caused inserts to fail with "null value in clerk_user_id violates not-null constraint".

## Root Cause
From migration `20241216_sprint3a_users_canonical.sql`:
- `clerk_user_id text UNIQUE NOT NULL` - **Canonical field, required**
- `clerk_id text` - Compatibility field (optional)

The sync route was only setting `clerk_id`, leaving `clerk_user_id` as NULL, which violates the NOT NULL constraint.

## Solution Applied

✅ **Updated `app/api/user/sync/route.ts`**:
- Now upserts **both** `clerk_user_id` and `clerk_id` (both set to `userId`)
- Uses `onConflict: "clerk_user_id"` (the canonical unique key)
- Handles nullable fields safely (email, name, phone)

## Code Changes

### Before:
```ts
.upsert({
  clerk_id: userId,  // ❌ Missing clerk_user_id (NOT NULL)
  // ...
}, {
  onConflict: "clerk_id",
})
```

### After:
```ts
.upsert({
  clerk_user_id: userId,  // ✅ NOT NULL field set
  clerk_id: userId,       // ✅ Compatibility field also set
  // ...
}, {
  onConflict: "clerk_user_id",  // ✅ Use canonical unique key
})
```

## Testing

### Step 1: Test User Sync
```js
fetch("/api/user/sync", { method: "POST" })
  .then(async (r) => ({ status: r.status, body: await r.json() }))
  .then(console.log)
  .catch(console.error);
```

**Expected**: `{ status: 200, body: { ok: true, user: {...} } }`

### Step 2: Test Autopilot Scan
```js
fetch("/api/autopilot/scan", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{}",
})
  .then(async (r) => ({ status: r.status, body: await r.json() }))
  .then(console.log)
  .catch(console.error);
```

**Expected**: `{ status: 200, body: { ok: true, job_id: "..." } }`

Check terminal logs for:
```
AUTOPILOT SCAN USER { clerkUserId: 'user_XXXX', supabaseUserId: 'uuid-XXXX' }
```

## Verification

✅ **Both fields set**: `clerk_user_id` (NOT NULL) and `clerk_id` (compat)  
✅ **Conflict resolution**: Uses canonical `clerk_user_id` unique key  
✅ **Null safety**: Email, name, phone handle nulls correctly  
✅ **Error handling**: Proper error responses

The user sync should now work correctly and the autopilot scan should no longer get "Not Found" errors! 🎉

