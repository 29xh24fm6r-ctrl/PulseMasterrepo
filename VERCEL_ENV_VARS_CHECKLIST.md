# Step 2: Verify Environment Variables

## Quick Checklist

### Required Variables (MUST be set for Production):

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- [ ] `CLERK_SECRET_KEY`

### Optional (but recommended):

- [ ] `OPENAI_API_KEY` (for LLM extraction in Mythic sessions)

---

## How to Check/Set in Vercel

### Step 1: Access Vercel Dashboard
1. Go to: **https://vercel.com/dashboard**
2. Sign in to your account
3. Select your project

### Step 2: Navigate to Environment Variables
1. Click **Settings** tab (top navigation)
2. Click **Environment Variables** in the left sidebar

### Step 3: Verify Each Variable

For each required variable, check:
- ✅ Variable exists
- ✅ It's enabled for **Production** environment
- ✅ Value is correct

### Step 4: Add Missing Variables

If any are missing:

1. Click **Add New** button
2. Enter:
   - **Key**: e.g., `NEXT_PUBLIC_SUPABASE_URL`
   - **Value**: Your actual value
   - **Environment**: Select **Production** (and Development/Preview if needed)
3. Click **Save**

### Step 5: Redeploy (if you added variables)

If you just added variables:
1. Go to **Deployments** tab
2. Click the **⋯** (three dots) on latest deployment
3. Click **Redeploy**
4. Or wait for next git push to trigger auto-deploy

---

## Where to Find Values

### Supabase Values:
1. Go to: **https://supabase.com/dashboard**
2. Select your project
3. **Settings** → **API**
4. Find:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

### Clerk Values:
1. Go to: **https://dashboard.clerk.com**
2. Select your application
3. **API Keys** section
4. Find:
   - **Publishable key** → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - **Secret key** → `CLERK_SECRET_KEY`

### OpenAI Key:
1. Go to: **https://platform.openai.com/api-keys**
2. Create or copy existing API key
3. → `OPENAI_API_KEY`

---

## Verification Script

Run locally to check your `.env.local`:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-env-vars.ps1
```

**Note:** This only checks local variables. You must also verify in Vercel Dashboard.

---

## Common Issues

### Variable not working after deployment:
- ✅ Verify it's set for **Production** environment (not just Development)
- ✅ Redeploy after adding new variables
- ✅ Check for typos in variable names
- ✅ Ensure no extra spaces in values

### Can't find variable in Vercel:
- ✅ Check you're in the correct project
- ✅ Verify you have admin access
- ✅ Look in Settings → Environment Variables (not project settings)

### Build fails with "undefined" errors:
- ✅ Check all `NEXT_PUBLIC_*` variables are set
- ✅ Verify variable names match exactly (case-sensitive)

---

## Next Step

After verifying environment variables:
✅ **Step 3:** Deploy code (commit & push)

---

**Status:** Ready to proceed once variables are verified! ✅

