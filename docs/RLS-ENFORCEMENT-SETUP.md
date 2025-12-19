# RLS Enforcement Setup Guide

## ✅ Implementation Complete

All user-facing Autopilot endpoints now use **user-scoped Supabase clients** with RLS enforcement.

## 🔧 Required Setup (One-Time)

### Step 1: Create Clerk JWT Template

**⚠️ CRITICAL**: This must be done in Clerk Dashboard before the system will work.

1. Go to **Clerk Dashboard** → **JWT Templates**
2. Click **"New template"**
3. Configure:
   - **Template name**: `supabase`
   - **Audience (aud)**: `authenticated`
4. Save

**Without this template**, API routes will throw:
```
Missing Supabase token. In Clerk Dashboard, create JWT template named 'supabase' with audience 'authenticated'.
```

## 📋 What Changed

### New Files
- `lib/supabase/userClient.ts` - User-scoped Supabase client helper

### Updated Files
- `lib/auth/resolveSupabaseUser.ts` - Now returns `supabaseAccessToken`
- `app/api/autopilot/suggestions/route.ts` - Uses user client (RLS enforced)
- `app/api/autopilot/suggestions/[id]/dismiss/route.ts` - Uses user client (RLS enforced)
- `app/api/autopilot/suggestions/[id]/snooze/route.ts` - Uses user client (RLS enforced)

### Unchanged (Still Use Service Role)
- `lib/server/jobs/handlers/autopilotScan.ts` - Background job, uses `supabaseAdmin`
- `app/api/autopilot/scan/route.ts` - Job enqueue, uses `supabaseAdmin`
- `app/api/autopilot/policies/*` - Policy management, uses `supabaseAdmin`

## 🔒 Security Model

### User-Facing Operations (RLS Enforced)
✅ **Read suggestions**: User client → RLS blocks cross-user access  
✅ **Dismiss suggestion**: User client → RLS blocks cross-user updates  
✅ **Snooze suggestion**: User client → RLS blocks cross-user updates  

### Background Operations (Service Role)
✅ **Scan handler**: Uses `supabaseAdmin` (bypasses RLS for background jobs)  
✅ **Job execution**: Uses `supabaseAdmin` (bypasses RLS for background jobs)  
✅ **Policy loading**: Uses `supabaseAdmin` (bypasses RLS for background jobs)  

## 🧪 Testing

### Test 1: Token Works
1. Create JWT template in Clerk (if not done)
2. Call `GET /api/autopilot/suggestions`
3. **Expected**: Returns suggestions (not token error)

### Test 2: RLS Enforcement
1. Log in as User A
2. Fetch User A's suggestions → should work
3. Try to dismiss User B's suggestion (use known ID)
4. **Expected**: Returns `404 Suggestion not found` (RLS blocked)

## 📝 Code Pattern

### Before (Service Role - No RLS)
```ts
const { supabaseUserId } = await resolveSupabaseUser();
const { data } = await supabaseAdmin
  .from("life_arc_autopilot_suggestions")
  .select("*")
  .eq("user_id", supabaseUserId);
```

### After (User Client - RLS Enforced)
```ts
const { supabaseUserId, supabaseAccessToken } = await resolveSupabaseUser();
const supabase = createUserSupabaseClient(supabaseAccessToken);
const { data } = await supabase
  .from("life_arc_autopilot_suggestions")
  .select("*")
  .eq("user_id", supabaseUserId); // RLS also enforces this
```

## 🎯 Benefits

1. **RLS is the gatekeeper**: Even if code has bugs, RLS prevents cross-user access
2. **Clean separation**: User operations use user client, background jobs use admin
3. **Audit trail**: All user operations are properly scoped
4. **Scalable**: Foundation for multi-tenant safety

## ⚠️ Important Notes

- **Clerk JWT Template Required**: Must create `supabase` template
- **Environment Variables**: Requires `NEXT_PUBLIC_SUPABASE_ANON_KEY` (already present)
- **RLS Policies**: Must exist on `life_arc_autopilot_suggestions` (already created in migration)

The system is now **RLS-hard**! 🎉

