# Step 2: Verify Environment Variables ✅

## Quick Action Items

### Check in Vercel Dashboard:

1. **Go to:** https://vercel.com/dashboard
2. **Select:** Your project
3. **Navigate:** Settings → Environment Variables
4. **Verify:** These variables exist for **Production**:

---

## Required Variables Checklist:

### ✅ Must Have (for Production):

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - Find in: Supabase Dashboard → Settings → API → Project URL

- [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - Find in: Supabase Dashboard → Settings → API → service_role key

- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - Find in: Clerk Dashboard → API Keys → Publishable key

- [ ] `CLERK_SECRET_KEY`
  - Find in: Clerk Dashboard → API Keys → Secret key

### ⚠️ Optional (Recommended):

- [ ] `OPENAI_API_KEY`
  - Find in: OpenAI Platform → API Keys
  - Note: Without this, Mythic sessions still save but LLM extraction won't work

---

## How to Add/Verify in Vercel:

1. **Add New Variable:**
   - Click **"Add New"** button
   - Enter Key name
   - Enter Value
   - **Important:** Check **"Production"** checkbox
   - Click **"Save"**

2. **Edit Existing:**
   - Click the variable name
   - Update value if needed
   - Verify **Production** is checked
   - Click **"Save"**

3. **Redeploy After Changes:**
   - After adding/updating variables, redeploy:
   - Go to **Deployments** tab
   - Click **⋯** on latest deployment → **Redeploy**

---

## Quick Verification:

✅ All 4 required variables set? → Proceed to Step 3  
❌ Missing variables? → Add them, then proceed

---

**Next:** Step 3 - Deploy Code

