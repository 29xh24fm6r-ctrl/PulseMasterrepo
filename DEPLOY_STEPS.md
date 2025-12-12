# 🚀 Deploy Mythic Story Sessions v1 - Step by Step

## Step 1: Apply Database Migration ⚠️ CRITICAL - DO THIS FIRST

### Option A: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard
   - Sign in and select your project

2. **Open SQL Editor:**
   - Click **SQL Editor** in the left sidebar
   - Click **New Query**

3. **Run Migration:**
   - Open file: `supabase/migrations/008_mythic_arc_tables.sql`
   - Copy **ALL** contents (Ctrl+A, Ctrl+C)
   - Paste into SQL Editor (Ctrl+V)
   - Click **Run** button (or press F5)
   - Verify: Should see "Success. No rows returned"

4. **Verify Migration:**
   ```sql
   -- Run this in SQL Editor to verify:
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
     AND table_name IN ('mythic_arcs', 'mythic_quests', 'mythic_rituals', 'life_canon_entries');
   ```
   - Expected: Should return 4 rows (one for each table)

### Option B: Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push
```

---

## Step 2: Verify Environment Variables

### In Vercel Dashboard:

1. **Go to Project Settings:**
   - Navigate to: https://vercel.com/dashboard
   - Select your project
   - Click **Settings** tab
   - Click **Environment Variables** in sidebar

2. **Verify These Variables Exist (for Production):**
   - `NEXT_PUBLIC_SUPABASE_URL` ✅
   - `SUPABASE_SERVICE_ROLE_KEY` ✅
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` ✅
   - `CLERK_SECRET_KEY` ✅
   - `OPENAI_API_KEY` ✅ (optional - for LLM extraction)

3. **If Missing:**
   - Click **Add New**
   - Enter name and value
   - Select **Production** environment
   - Click **Save**
   - **Important:** Redeploy after adding variables

---

## Step 3: Deploy Code

### Option A: Git Push (Auto-Deploy)

Files are already staged. Run:

```bash
git commit -m "feat: Mythic Story Sessions v1 - Production ready"
git push origin main
```

(Replace `main` with your main branch name if different, e.g., `dev`)

### Option B: Vercel CLI

```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Deploy to production
vercel --prod
```

### Option C: Vercel Dashboard

1. Go to: https://vercel.com/dashboard
2. Select your project
3. If Git is connected, push to your main branch
4. Or click **Deployments** → **Create Deployment**

---

## Step 4: Verify Deployment

### Check Build:

1. Go to Vercel Dashboard → Deployments
2. Check latest deployment:
   - ✅ Status: "Ready"
   - ✅ No build errors
   - ✅ Build completed successfully

### Test Feature:

1. **Open Your App:**
   - Navigate to your deployed URL
   - Go to `/home` (or your dashboard page)

2. **Verify Mythic Card:**
   - Should see "Mythic Arc Card" component
   - Shows "The Current Chapter" or existing arc
   - Has "Continue" and "Refresh" buttons

3. **Test Session Creation:**
   - Click **Continue**
   - Modal should open
   - Enter test transcript
   - Click **Canonize Session**
   - Should save successfully
   - Modal should close
   - Card should update

### Check Database:

Run in Supabase SQL Editor:
```sql
-- After creating a test session:
SELECT COUNT(*) as arc_count FROM mythic_arcs;
SELECT COUNT(*) as session_count FROM mythic_sessions;
SELECT COUNT(*) as canon_count FROM life_canon_entries;
```

Expected: Counts should increase after creating sessions.

---

## 🆘 Troubleshooting

### Build Fails:
- Check build logs in Vercel
- Mythic code should compile fine
- Other build errors might be unrelated

### Feature Not Showing:
- Hard refresh browser (Ctrl+Shift+R)
- Clear browser cache
- Check browser console for errors

### Sessions Don't Save:
- Verify migration was applied (Step 1)
- Check Supabase logs
- Verify environment variables

### Database Errors:
- Re-run migration
- Check RLS policies are enabled
- Verify tables exist

---

## 📋 Quick Checklist

- [ ] Database migration applied (Step 1)
- [ ] Environment variables verified (Step 2)
- [ ] Code committed and pushed (Step 3)
- [ ] Deployment successful (Step 4)
- [ ] Feature tested in production (Step 4)

---

**Ready!** Follow the steps above to deploy. 🚀

