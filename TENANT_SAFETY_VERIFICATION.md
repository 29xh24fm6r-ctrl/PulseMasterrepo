# ✅ Tenant Safety Verification Guide

## Quick Start: Test Your Security

### 1. Run Quick Safety Checks

```bash
# Check for common security issues
npm run check-tenant-safety

# Full audit of all routes
npm run audit-tenant
```

### 2. Test the Debug Endpoint

Once your app is running:

```bash
# In your browser (while logged in):
http://localhost:3000/api/_debug/tenant-safety

# Should return:
# - Your userId
# - Counts for each table (filtered by your userId)
# - Security check confirming no cross-user data leakage
```

**⚠️ IMPORTANT**: Delete `/app/api/_debug/tenant-safety/route.ts` after validation!

### 3. Two-User Isolation Test

1. **Create User A in Clerk**
   - Login as User A
   - Create a contact: "John Doe" 
   - Create a deal: "Test Deal A"
   - Complete an emotional check-in

2. **Create User B in Clerk**
   - Login as User B
   - Visit dashboard → should see **ZERO** of User A's data
   - Visit `/api/_debug/tenant-safety` → all counts should be 0 or User B's data only
   - Try to access CRM → should be empty (not User A's data)

3. **If User B sees User A's data anywhere:**
   - Note which route/table is leaking
   - Check that route uses `owner_user_id` filter
   - Check that route uses `requireClerkUserId()` and `supabaseServer()`

## What We've Fixed ✅

### Core Infrastructure
- ✅ `lib/auth/requireUser.ts` - Standardized auth
- ✅ `lib/supabase/server.ts` - Server-side client
- ✅ `lib/api/routeErrors.ts` - Standardized errors
- ✅ `lib/db/tenant.ts` - Tenant utilities
- ✅ `lib/feature-flags.ts` - Feature flags

### Critical Routes Fixed
- ✅ `/api/crm/deals` - Tenant isolated
- ✅ `/api/crm/contacts` - Tenant isolated
- ✅ `/api/pulse/core` - Tenant isolated
- ✅ `/api/emotions/checkin` - Tenant isolated
- ✅ `/api/profile` - Enhanced error handling
- ✅ `/api/emotion` - Enhanced error handling

### Notion Disabled
- ✅ All 4 Notion routes return 404 when `FEATURE_NOTION=false`

### Beta Mode
- ✅ Middleware restrictions in place
- ✅ Feature flag system active

## Common Issues to Watch For 🔍

### Issue 1: ANON_KEY Usage
**Symptom**: Routes using `NEXT_PUBLIC_SUPABASE_ANON_KEY` on server
**Fix**: Use `supabaseServer()` helper (uses service role key)
**Check**: `npm run check-tenant-safety`

### Issue 2: Missing Owner Filter
**Symptom**: Queries like `.from("table").select("*")` without `.eq("owner_user_id", userId)`
**Fix**: Add `.eq("owner_user_id", userId)` to ALL queries on user-owned tables
**Check**: `npm run audit-tenant`

### Issue 3: Background/Cron Jobs
**Symptom**: Routes that run without a user context
**Fix**: Either:
- Loop over users and scope each operation
- Use a system user/service account
- Skip routes that require user context

### Issue 4: Notion Routes Still Active
**Symptom**: Notion routes return data instead of 404
**Fix**: Ensure `FEATURE_NOTION=false` in environment
**Check**: Visit `/api/notion/tasks` → should return 404

## Remaining Work 📋

### High Priority
1. **Fix remaining routes** - Run audit and fix issues:
   ```bash
   npm run audit-tenant
   ```

2. **Update library functions** - Many files in `lib/` still use old patterns:
   - Replace `user_id` filters with `owner_user_id`
   - Use Clerk `userId` directly

3. **Fix import issues** - 79 files need `supabaseAdminClient` → `supabaseAdmin`:
   ```bash
   npm run fix-imports
   ```

### Medium Priority
4. Update Email/Calendar routes
5. Update Memory/Third Brain routes
6. Update all remaining API routes systematically

## Verification Checklist

Before beta launch, verify:

- [ ] `npm run check-tenant-safety` passes
- [ ] `npm run audit-tenant` shows 0 critical issues
- [ ] `/api/_debug/tenant-safety` works and shows only your data
- [ ] Two-user isolation test passes (User B sees zero User A data)
- [ ] All Notion routes return 404
- [ ] All critical user flows work end-to-end
- [ ] Environment variables set:
  ```bash
  FEATURE_NOTION=false
  PULSE_BETA_MODE=true
  ```

## Environment Setup

Required environment variables:

```bash
# Feature Flags
FEATURE_NOTION=false
PULSE_BETA_MODE=true

# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
```

## Quick Reference Patterns

### Standard Route Pattern
```typescript
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { supabaseServer } from "@/lib/supabase/server";
import { jsonOk, handleRouteError } from "@/lib/api/routeErrors";

export async function GET() {
  try {
    const userId = await requireClerkUserId();
    const supabase = supabaseServer();
    
    const { data, error } = await supabase
      .from("table_name")
      .select("*")
      .eq("owner_user_id", userId); // ALWAYS filter
    
    if (error) throw error;
    return jsonOk({ data });
  } catch (err) {
    return handleRouteError(err);
  }
}
```

### Standard Insert Pattern
```typescript
const { data, error } = await supabase
  .from("table_name")
  .insert([{ 
    owner_user_id: userId, // ALWAYS include
    ...otherFields 
  }])
  .select()
  .single();
```

### Standard Update Pattern
```typescript
const { data, error } = await supabase
  .from("table_name")
  .update(changes)
  .eq("id", id)
  .eq("owner_user_id", userId) // ALWAYS filter
  .select()
  .single();
```

## Need Help?

If you find cross-user data leakage:

1. Note the exact route and table
2. Check if route uses `requireClerkUserId()`
3. Check if route uses `supabaseServer()`
4. Check if query has `.eq("owner_user_id", userId)`
5. Check if insert includes `owner_user_id: userId`

Run the audit script to find all issues:
```bash
npm run audit-tenant
```

