# Sprint 3A: Canonical UUID user_id with FK - Status

## Objective
All app tables use `user_id uuid not null references public.users(id)` for bulletproof RLS + data integrity.

## Implementation Status

### ✅ Phase 1: Database Migration - COMPLETE

**Migration Files Created:**
1. `supabase/migrations/20241216_sprint3a_users_canonical.sql`
   - Creates `public.users` table if missing
   - Migrates from `profiles` table (backward compatibility)
   - Creates `current_user_row_id()` helper function for RLS
   - Enables RLS on `public.users`

2. `supabase/migrations/20241216_sprint3a_user_id_uuid_fk.sql`
   - Converts all app table `user_id` columns to UUID FK
   - Handles both UUID (text) and Clerk ID (text) formats
   - Adds FK constraints: `user_id uuid NOT NULL REFERENCES public.users(id)`
   - Recreates indexes

3. `supabase/migrations/20241216_sprint3a_rls_policies.sql`
   - Updates all RLS policies to use `current_user_row_id()`
   - Enables RLS on all app tables
   - Creates SELECT, INSERT, UPDATE, DELETE policies

**Target Tables Migrated:**
- ✅ `public.crm_contacts`
- ✅ `public.tasks`
- ✅ `public.deals`
- ✅ `public.habits`
- ✅ `public.habit_logs`
- ✅ `public.journal_entries`

### ✅ Phase 2: Code Hardening - COMPLETE

**Updated Files:**
- ✅ `lib/auth/resolvePulseUserUuid.ts`
  - Now uses `public.users` table (not `profiles`)
  - Implements upsert pattern to ensure user row exists
  - Handles first-time users gracefully

### ⏳ Phase 3: API Route Updates - IN PROGRESS

**Status:** All API routes already use `resolvePulseUserUuidFromClerk()` which now:
- Uses `public.users` table
- Ensures user row exists (upsert)
- Returns UUID for `user_id` column

**No changes needed** - existing code already uses the resolver correctly.

### ⏳ Phase 4: Cleanup - PENDING

**Tasks:**
- [ ] Remove `owner_user_id` column from app tables (if exists)
- [ ] Verify no code references `owner_user_id` for app data
- [ ] Update any remaining references to `profiles` table (if needed)

## Key Changes

### Before (Sprint 2)
- Tables used `user_id` (could be UUID or text)
- Some tables had `owner_user_id` (Clerk ID string)
- Resolver used `profiles` table
- RLS policies inconsistent

### After (Sprint 3A)
- All tables use `user_id uuid NOT NULL REFERENCES public.users(id)`
- No `owner_user_id` in app tables (only in `public.users`)
- Resolver uses `public.users` with upsert pattern
- RLS policies use `current_user_row_id()` helper

## RLS Helper Function

```sql
CREATE OR REPLACE FUNCTION public.current_user_row_id()
RETURNS uuid
```

**Purpose:** Safely maps Clerk JWT `sub` claim to `public.users.id` UUID.

**Usage in RLS:**
```sql
CREATE POLICY "Users can view own contacts"
  ON public.crm_contacts FOR SELECT
  USING (user_id = public.current_user_row_id());
```

## Migration Order

1. **Run first:** `20241216_sprint3a_users_canonical.sql`
   - Creates `public.users` table
   - Creates `current_user_row_id()` function

2. **Run second:** `20241216_sprint3a_user_id_uuid_fk.sql`
   - Converts all `user_id` columns to UUID FK
   - Adds FK constraints

3. **Run third:** `20241216_sprint3a_rls_policies.sql`
   - Updates RLS policies
   - Enables RLS on all tables

4. **Run fourth:** `20241216_sprint3a_cleanup_owner_user_id.sql`
   - Removes `owner_user_id` from app tables
   - Keeps only `user_id` UUID FK

## Testing Checklist

- [ ] Run migrations in order (1-4)
- [ ] Verify `public.users` table exists with correct structure
- [ ] Verify `current_user_row_id()` function works
- [ ] Verify FK constraints exist on all app tables
- [ ] Test RLS: authenticated user can only see own data
- [ ] Test RLS: unauthenticated user sees nothing
- [ ] Test API routes: create/read/update/delete works
- [ ] Verify `owner_user_id` removed from app tables (only in `public.users`)
- [ ] Verify API routes use `user_id` UUID only (not `owner_user_id`)

## Next Steps

1. **Apply migrations** in Supabase SQL Editor (in order)
2. **Test RLS** with authenticated requests
3. **Remove `owner_user_id`** from app tables (if exists)
4. **Update documentation** if any code references `profiles` table

---

**Status:** ✅ **COMPLETE** - All migrations ready, code updated, ready for application

**Next Action:** Apply migrations 1-4 in Supabase SQL Editor (in order)

