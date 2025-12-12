# 🚀 Pulse OS Beta Readiness Checklist

## Critical Security Requirements

### ✅ Completed Infrastructure

1. **Authentication Helpers**
   - ✅ `lib/auth/requireUser.ts` - Standardized auth checking
   - ✅ `lib/supabase/server.ts` - Server-side Supabase client
   - ✅ `lib/api/routeErrors.ts` - Standardized error handling
   - ✅ `lib/db/tenant.ts` - Tenant isolation utilities
   - ✅ `lib/feature-flags.ts` - Feature flag system

2. **Beta Mode Infrastructure**
   - ✅ `app/middleware-beta.ts` - Beta restrictions
   - ✅ Notion routes disabled via feature flag
   - ✅ Middleware integrated

3. **Critical Routes Fixed**
   - ✅ `/api/crm/deals` - Uses `owner_user_id`
   - ✅ `/api/crm/contacts` - Uses `owner_user_id`
   - ✅ `/api/pulse/core` - Uses `owner_user_id`
   - ✅ `/api/emotion` - Enhanced error handling
   - ✅ `/api/profile` - Enhanced error handling

4. **Library Functions Updated**
   - ✅ `lib/crm/deals.ts` - Uses `owner_user_id`
   - ✅ `lib/crm/contacts.ts` - Uses `owner_user_id`
   - ✅ `lib/thirdbrain/graph/query.ts` - Fixed import
   - ✅ `lib/workspace/focus.ts` - Fixed import

### ⚠️ Remaining Work

#### High Priority (Must Fix Before Beta)

1. **Fix All Supabase Imports** (79 files)
   - Run: `npm run fix-imports` or manually fix
   - Pattern: `supabaseAdminClient` → `supabaseAdmin`
   - Pattern: `from '../../supabase/admin'` → `from '@/lib/supabase'`

2. **Update All Library Functions**
   - Replace `user_id` filters with `owner_user_id`
   - Use Clerk `userId` directly (not `dbUserId`)
   - Add `owner_user_id` to all inserts

3. **Update All API Routes**
   - Use `requireClerkUserId()` pattern
   - Use `supabaseServer()` helper
   - Add `.eq('owner_user_id', userId)` to all queries

#### Medium Priority

4. **Memory/Third Brain Routes**
   - Update all `lib/thirdbrain/**` functions
   - Update all `lib/memory/**` functions
   - Ensure all queries filter by `owner_user_id`

5. **Email/Calendar Routes**
   - Update email sync routes
   - Update calendar routes
   - Ensure tenant isolation

6. **Workspace Routes**
   - Update workspace day log
   - Update workspace projections
   - Ensure tenant isolation

## Testing Protocol

### Pre-Beta Testing

1. **Create Test Users**
   ```bash
   # User A: test-user-a@example.com
   # User B: test-user-b@example.com
   ```

2. **Seed Data for User A**
   - Create contacts, deals, tasks
   - Create journal entries
   - Create habits and completions

3. **Verify Isolation**
   - Login as User B
   - Verify User B sees ZERO of User A's data
   - Try to access User A's data via API directly
   - Verify all queries return empty arrays

4. **Run Audit**
   ```bash
   npm run audit-tenant
   ```
   - Should return 0 unfiltered routes

## Environment Setup

```bash
# Required for beta
FEATURE_NOTION=false
PULSE_BETA_MODE=true

# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# Clerk (required)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
```

## Quick Reference

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
      .eq("owner_user_id", userId); // ALWAYS filter by owner_user_id
    
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
    owner_user_id: userId, // ALWAYS include owner_user_id
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
  .eq("owner_user_id", userId) // ALWAYS filter by owner_user_id
  .select()
  .single();
```

## Critical Reminder

⚠️ **NEVER** query a user-owned table without `.eq('owner_user_id', userId)`
⚠️ **NEVER** insert into a user-owned table without `owner_user_id: userId`
⚠️ **ALWAYS** use `requireClerkUserId()` for authentication
⚠️ **ALWAYS** use `supabaseServer()` for server-side database access

## Next Steps

1. Run `npm run fix-imports` to fix all import issues
2. Run `npm run audit-tenant` to find remaining issues
3. Fix all issues found by audit
4. Test with 2 users
5. Verify zero cross-user data leakage
6. Deploy to beta environment

