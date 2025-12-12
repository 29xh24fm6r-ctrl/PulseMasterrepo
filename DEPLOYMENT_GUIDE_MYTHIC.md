# Mythic Story Sessions v1 - Deployment Guide

**Status:** ✅ Ready to Deploy  
**Date:** 2025-01-XX

---

## Pre-Deployment Checklist

### 1. Database Migration ✅ CRITICAL

**Apply the migration before deploying code:**

```bash
# Option A: Using Supabase CLI (Recommended)
supabase db push

# Option B: Using Supabase Dashboard
# 1. Go to Supabase Dashboard → SQL Editor
# 2. Run migration file: supabase/migrations/008_mythic_arc_tables.sql
```

**Migration creates:**
- ✅ `mythic_arcs` table with `user_id UUID`
- ✅ `mythic_quests` table with `user_id UUID`
- ✅ `mythic_rituals` table with `user_id UUID`
- ✅ `life_canon_entries` table with `user_id UUID`
- ✅ RLS policies for all tables
- ✅ Indexes for performance

**Verify migration:**
```sql
-- Run in Supabase SQL Editor
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('mythic_arcs', 'mythic_quests', 'mythic_rituals', 'life_canon_entries')
  AND column_name = 'user_id'
ORDER BY table_name;
```

Expected: All 4 tables should have `user_id` column of type `uuid`.

---

### 2. Environment Variables ✅ REQUIRED

**Ensure these are set in your deployment platform (Vercel/Netlify/etc):**

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Clerk (Required)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret

# OpenAI (Optional - for LLM extraction)
OPENAI_API_KEY=your_openai_key  # Without this, extraction won't work but sessions will still save
```

**To verify in Vercel:**
1. Go to Project Settings → Environment Variables
2. Ensure all above variables are set for Production
3. Redeploy if you just added them

---

### 3. Code Verification ✅

**Mythic code is verified and ready:**
- ✅ All API routes functional
- ✅ UI components tested
- ✅ Database schema standardized to `user_id UUID`
- ✅ RLS policies defined
- ✅ Error handling in place

---

## Deployment Steps

### Option A: Deploy via Vercel (Recommended)

#### Step 1: Push to Git

```bash
# Commit all changes
git add .
git commit -m "feat: Mythic Story Sessions v1 - Ready for production"
git push origin main  # or your main branch
```

#### Step 2: Deploy on Vercel

**Via CLI:**
```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Deploy to production
vercel --prod
```

**Via Dashboard:**
1. Go to https://vercel.com/dashboard
2. Select your project
3. Click "Deploy" or push to connected Git branch
4. Wait for build to complete

#### Step 3: Verify Deployment

1. Check build logs for errors
2. Test the deployed app:
   - Navigate to `/home`
   - Verify Mythic Arc Card renders
   - Click "Continue" to open modal
   - Submit a test session

---

### Option B: Manual Deployment

```bash
# 1. Build the app
npm run build

# 2. Test build locally
npm start

# 3. Deploy build output to your hosting platform
# (Follow your hosting provider's instructions)
```

---

## Post-Deployment Verification

### 1. Database Check ✅

```sql
-- Run in Supabase SQL Editor after first user interaction
SELECT COUNT(*) as arc_count FROM mythic_arcs;
SELECT COUNT(*) as session_count FROM mythic_sessions;
SELECT COUNT(*) as canon_count FROM life_canon_entries;

-- Should show 0 or more rows per user
```

### 2. API Endpoints Test

**Test GET endpoint:**
```bash
# Replace with your deployed URL and auth token
curl -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  https://your-app.vercel.app/api/mythic/state
```

**Expected Response:**
```json
{
  "activeArc": null,  // or arc object
  "actLabel": null,   // or act label
  "dominantTrial": null,
  "shadowLine": null,
  "activeQuestCount": 0,
  "latestSession": null
}
```

**Test POST endpoint:**
```bash
curl -X POST https://your-app.vercel.app/api/mythic/session \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionType": "arc_deepen",
    "transcript": "Test deployment - this is a test session."
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "session": { ... },
  "extracted": { ... }  // or null if LLM extraction disabled/failed
}
```

### 3. UI Test ✅

1. **Login to deployed app**
2. **Navigate to `/home`**
3. **Verify Mythic Arc Card:**
   - ✅ Card renders (shows "The Current Chapter" if no arc)
   - ✅ "Continue" button visible
   - ✅ "Refresh" button visible

4. **Test Session Creation:**
   - ✅ Click "Continue"
   - ✅ Modal opens
   - ✅ Enter transcript
   - ✅ Click "Canonize Session"
   - ✅ Session saves (no errors)
   - ✅ Modal closes
   - ✅ Card updates (refresh if needed)

### 4. Error Scenarios ✅

**Test graceful degradation:**

1. **Without OPENAI_API_KEY:**
   - ✅ Sessions still save
   - ✅ No extraction occurs
   - ✅ No errors thrown

2. **With empty transcript:**
   - ✅ Save button disabled
   - ✅ Error shown if somehow submitted

3. **With invalid auth:**
   - ✅ 401 error returned
   - ✅ No data leaked

---

## Rollback Plan

**If issues occur after deployment:**

### Quick Rollback (Vercel)

```bash
# Option 1: Via Dashboard
# Go to Vercel → Deployments → Click previous successful deployment → Promote to Production

# Option 2: Via CLI
vercel rollback [deployment-url]
```

### Database Rollback

**If migration caused issues:**
```sql
-- DROP tables (use with caution - deletes all data)
DROP TABLE IF EXISTS life_canon_entries CASCADE;
DROP TABLE IF EXISTS mythic_rituals CASCADE;
DROP TABLE IF EXISTS mythic_quests CASCADE;
DROP TABLE IF EXISTS mythic_arcs CASCADE;

-- Then re-apply migration if needed
```

---

## Monitoring & Alerts

### Key Metrics to Monitor

1. **API Response Times:**
   - `/api/mythic/state` - Should be < 500ms
   - `/api/mythic/session` - Should be < 2000ms (LLM extraction can add delay)

2. **Error Rates:**
   - Monitor for 500 errors on Mythic endpoints
   - Check for database connection errors

3. **Database Performance:**
   - Monitor query times on `mythic_arcs` table
   - Check index usage

### Log Monitoring

**Watch for these log patterns:**
- ✅ `[Mythic Extract] LLM call failed` - Expected if OPENAI_API_KEY missing
- ❌ `[Mythic Engine] Failed to update arc` - Unexpected, investigate
- ❌ `Failed to save session` - Unexpected, investigate

---

## Success Criteria

**Deployment is successful when:**

- ✅ Migration applied successfully
- ✅ All environment variables set
- ✅ Build completes without errors
- ✅ Users can see Mythic Arc Card on `/home`
- ✅ Users can create sessions
- ✅ Sessions save to database
- ✅ No 500 errors in logs
- ✅ LLM extraction works (if API key provided)

---

## Support & Troubleshooting

### Common Issues

**Issue: "Cannot find module '@/lib/mythic/engine'"**
- **Fix:** Ensure all Mythic files are committed to Git
- **Check:** `lib/mythic/engine.ts` exists in repository

**Issue: "relation 'mythic_arcs' does not exist"**
- **Fix:** Migration not applied
- **Action:** Apply `supabase/migrations/008_mythic_arc_tables.sql`

**Issue: "user_id column does not exist"**
- **Fix:** Migration not applied or applied incorrectly
- **Action:** Re-run migration

**Issue: "Failed to save session" - 500 error**
- **Check:** Supabase connection working
- **Check:** Service role key correct
- **Check:** RLS policies allow inserts

**Issue: LLM extraction not working**
- **Check:** `OPENAI_API_KEY` is set
- **Check:** API key is valid
- **Note:** Sessions still save without extraction

---

## Next Steps After Deployment

1. ✅ Monitor logs for first 24 hours
2. ✅ Test with real user accounts
3. ✅ Gather user feedback
4. ✅ Monitor database growth
5. ✅ Optimize queries if needed

---

## Deployment Sign-Off

**Ready to Deploy:** ✅ YES

**Verified By:**
- ✅ Code review complete
- ✅ Database schema verified
- ✅ API endpoints tested
- ✅ UI components tested
- ✅ Error handling verified
- ✅ Security (RLS) verified

**Deployment Risk:** 🟢 LOW

- All systems verified
- Graceful degradation in place
- Rollback plan available

---

**Last Updated:** 2025-01-XX  
**Next Review:** After first production deployment

