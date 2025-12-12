# ✅ Tenant Safety Implementation - Beta Readiness

## Status: IN PROGRESS

This document tracks the implementation of tenant safety across Pulse OS to make it beta-safe.

## Completed ✅

### Step 1: Core Infrastructure
- ✅ `lib/auth/requireUser.ts` - Authentication helper
- ✅ `lib/supabase/server.ts` - Server-side Supabase client
- ✅ `lib/api/routeErrors.ts` - Standardized error responses
- ✅ `lib/db/tenant.ts` - Tenant utilities (`withOwner`, `assertOwnership`)
- ✅ `lib/feature-flags.ts` - Feature flag system

### Step 2: Critical Routes Fixed
- ✅ `app/api/crm/deals/route.ts` - Updated to use `requireClerkUserId` and standard errors
- ✅ `app/api/crm/contacts/route.ts` - Updated to use `requireClerkUserId` and standard errors
- ✅ `app/api/pulse/core/route.ts` - Updated to use `owner_user_id` filters
- ✅ `lib/crm/deals.ts` - Updated to use `owner_user_id` instead of `user_id`

### Step 3: Notion Disabled
- ✅ `app/api/notion/tasks/route.ts` - Disabled via feature flag
- ✅ `app/api/notion/habits/route.ts` - Disabled via feature flag
- ✅ `app/api/notion/deals/route.ts` - Disabled via feature flag
- ✅ `app/api/notion/contacts/route.ts` - Disabled via feature flag

### Step 4: Beta Mode Infrastructure
- ✅ `app/middleware-beta.ts` - Beta mode middleware
- ✅ `middleware.ts` - Integrated beta middleware
- ✅ Feature flag system in place

### Step 5: Audit Script
- ✅ `scripts/audit-owner-filter.ts` - Created audit script (Node.js version)
- ✅ `scripts/fix-all-supabase-imports.ps1` - PowerShell script to fix imports

## In Progress 🔄

### Fixing Import Issues
- ⚠️ **79 files** need `supabaseAdminClient` → `supabaseAdmin` replacement
- ⚠️ All imports from `../../supabase/admin` → `@/lib/supabase`

**Note**: The PowerShell script is available but needs manual review. Files can also be fixed individually.

## Remaining Work 📋

### Step 6: Update All Library Functions
Files in `lib/` that use `supabaseAdminClient` or import from `supabase/admin`:

**Critical Priority:**
- `lib/crm/contacts.ts` - Update to use `owner_user_id`
- `lib/crm/organizations.ts` - Update to use `owner_user_id`
- `lib/crm/interactions.ts` - Update to use `owner_user_id`
- `lib/crm/health.ts` - Update to use `owner_user_id`
- `lib/crm/alerts.ts` - Update to use `owner_user_id`

**High Priority:**
- All files in `lib/thirdbrain/` - Use `owner_user_id`
- All files in `lib/workspace/` - Use `owner_user_id`
- All files in `lib/boardroom/` - Use `owner_user_id`
- All files in `lib/masterbrain/` - Use `owner_user_id`
- All files in `lib/creative/` - Use `owner_user_id`
- All files in `lib/destiny/` - Use `owner_user_id`
- All files in `lib/mythic/` - Use `owner_user_id`
- All files in `lib/selfmirror/` - Use `owner_user_id`
- All files in `lib/life_canon/` - Use `owner_user_id`
- All files in `lib/executive_council/` - Use `owner_user_id`
- All files in `lib/strategic_mind/` - Use `owner_user_id`
- All files in `lib/what_if_replay/` - Use `owner_user_id`

### Step 7: Update All API Routes
All routes in `app/api/**/route.ts` need:
1. Use `requireClerkUserId()` instead of manual auth check
2. Use `supabaseServer()` instead of direct createClient
3. Add `.eq('owner_user_id', userId)` to all queries on user-owned tables
4. Use `withOwner()` helper for inserts
5. Use `jsonOk()` / `jsonError()` for responses

### Step 8: Database Schema Verification
- Verify all user-owned tables have `owner_user_id TEXT` column
- Verify indexes exist on `owner_user_id` for performance
- Verify foreign key constraints are correct

## Testing Checklist ✅

Before beta launch, verify:

1. [ ] Create 2 test users in Clerk
2. [ ] Seed data for User A
3. [ ] Log in as User B
4. [ ] Confirm User B sees **zero** of User A's data:
   - [ ] Dashboard
   - [ ] Emails
   - [ ] Calendar
   - [ ] Contacts / CRM
   - [ ] Memory / Third Brain
   - [ ] Tasks
   - [ ] Deals
   - [ ] Journal entries
   - [ ] Habits
   - [ ] XP data
5. [ ] Run audit script: `node scripts/audit-owner-filter.ts`
6. [ ] Confirm "0 unfiltered routes"
7. [ ] Test all critical user flows end-to-end

## Environment Variables Required

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...

# Feature Flags
FEATURE_NOTION=false  # Disable Notion for beta
PULSE_BETA_MODE=true  # Enable beta mode restrictions

# OpenAI
OPENAI_API_KEY=...
```

## Quick Fix Pattern

For any API route:

**Before:**
```ts
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data } = await supabase.from("table").select("*").eq("user_id", userId);
  return NextResponse.json({ data });
}
```

**After:**
```ts
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { supabaseServer } from "@/lib/supabase/server";
import { jsonOk, handleRouteError } from "@/lib/api/routeErrors";

export async function GET() {
  try {
    const userId = await requireClerkUserId();
    const supabase = supabaseServer();
    
    const { data, error } = await supabase
      .from("table")
      .select("*")
      .eq("owner_user_id", userId); // Use owner_user_id, not user_id
    
    if (error) throw error;
    return jsonOk({ data });
  } catch (err) {
    return handleRouteError(err);
  }
}
```

## Next Steps

1. **Run the PowerShell script** to fix all `supabaseAdminClient` imports:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/fix-all-supabase-imports.ps1
   ```

2. **Run the audit script** to find remaining issues:
   ```bash
   npm run audit-tenant
   # Or: node scripts/audit-owner-filter.ts
   ```

3. **Update package.json** to add audit script:
   ```json
   "scripts": {
     "audit-tenant": "ts-node scripts/audit-owner-filter.ts"
   }
   ```

4. **Systematically fix remaining routes** using the pattern above

5. **Test with 2 users** before beta launch

## Notes

- The codebase has a mix of `user_id` and `owner_user_id`. For beta safety, **always use `owner_user_id`**.
- Some tables may still use `user_id` internally - that's fine, but **always filter by `owner_user_id`**.
- The audit script may have false positives - manual review is required.
- Notion routes are disabled but not deleted - they can be re-enabled by setting `FEATURE_NOTION=true`.

