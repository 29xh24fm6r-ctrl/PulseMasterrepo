# Quick Deployment Steps - Mythic Story Sessions v1

## 🚀 Deploy in 3 Steps

### Step 1: Apply Database Migration ⚠️ DO THIS FIRST

**Option A: Supabase Dashboard (Recommended)**
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in left sidebar
4. Click **New Query**
5. Copy entire contents of: `supabase/migrations/008_mythic_arc_tables.sql`
6. Paste into SQL Editor
7. Click **Run** (or press F5)
8. Verify: Should see "Success. No rows returned"

**Option B: Supabase CLI**
```bash
supabase db push
```

---

### Step 2: Verify Environment Variables

**In Vercel Dashboard:**
1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Verify these are set for **Production**:
   - ✅ `NEXT_PUBLIC_SUPABASE_URL`
   - ✅ `SUPABASE_SERVICE_ROLE_KEY`
   - ✅ `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - ✅ `CLERK_SECRET_KEY`
   - ✅ `OPENAI_API_KEY` (optional - for LLM extraction)

**If missing:** Add them, then redeploy

---

### Step 3: Deploy Code

**Option A: Git Push (if auto-deploy enabled)**
```bash
git add .
git commit -m "feat: Mythic Story Sessions v1 - Production ready"
git push origin main  # or your main branch
```

**Option B: Vercel CLI**
```bash
vercel --prod
```

**Option C: Vercel Dashboard**
1. Go to: https://vercel.com/dashboard
2. Select your project
3. Click **Deployments**
4. Click **Create Deployment** or push to connected Git branch

---

## ✅ Verify Deployment

After deployment completes:

1. **Check Build Logs:**
   - Should show "Build successful"
   - No errors related to Mythic files

2. **Test the Feature:**
   - Go to your deployed app
   - Navigate to `/home` (or your dashboard)
   - Look for **Mythic Arc Card**
   - Click **Continue**
   - Submit a test session
   - Verify it saves

3. **Check Database:**
   ```sql
   -- In Supabase SQL Editor
   SELECT COUNT(*) FROM mythic_arcs;
   SELECT COUNT(*) FROM mythic_sessions;
   SELECT COUNT(*) FROM life_canon_entries;
   ```

---

## 🆘 Troubleshooting

**Build Fails:**
- Check for TypeScript errors in build logs
- Verify all imports are correct
- Mythic-specific code should compile fine

**Feature Doesn't Appear:**
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Check browser console for errors

**Sessions Don't Save:**
- Verify migration was applied
- Check Supabase logs for errors
- Verify environment variables are correct

**Database Errors:**
- Re-run migration
- Check RLS policies are enabled
- Verify `user_id` columns exist

---

## 📚 Full Documentation

- `DEPLOYMENT_GUIDE_MYTHIC.md` - Detailed deployment guide
- `DEPLOYMENT_READINESS_CHECKLIST.md` - Complete checklist
- `MYTHIC_VERIFICATION_REPORT.md` - Verification details
- `MYTHIC_TESTING_GUIDE.md` - Testing instructions

---

**Ready to deploy!** 🚀

