# Vercel Environment Variables

## Required Environment Variables

These environment variables must be set in your Vercel project settings for the application to build and run correctly.

### Supabase Configuration

- **`NEXT_PUBLIC_SUPABASE_URL`** (Required)
  - Your Supabase project URL
  - Format: `https://your-project.supabase.co`
  - Used by: Client and server code

- **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** (Required)
  - Supabase anonymous/public key
  - Used by: Browser client for RLS-protected queries

- **`SUPABASE_SERVICE_ROLE_KEY`** (Required - Server-only)
  - Supabase service role key (bypasses RLS)
  - Used by: Server-side admin client (`lib/supabase/admin.ts`)
  - ⚠️ **Never expose this in client code**

### Authentication (Clerk)

- **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`** (Required)
  - Clerk publishable key for client-side authentication

- **`CLERK_SECRET_KEY`** (Required)
  - Clerk secret key for server-side authentication

### AI/LLM (OpenAI)

- **`OPENAI_API_KEY`** (Required)
  - OpenAI API key for LLM features
  - Used by: AGI, coaching, and other AI-powered features

### Optional Environment Variables

- **`TEST_CLERK_USER_ID`** (Optional)
  - Test user ID for development/testing
  - Used by: Test scripts

---

## Setting Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to: **Settings** → **Environment Variables**
3. Add each variable with its value
4. Select the environment(s) where it applies:
   - Production
   - Preview
   - Development
5. Click **Save**
6. **Redeploy** your application after adding new variables

---

## Local Development

Create a `.env.local` file in the project root with:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
CLERK_SECRET_KEY=your-clerk-secret-key
OPENAI_API_KEY=your-openai-key
```

⚠️ **Never commit `.env.local` to version control**

---

## Verification

After setting environment variables, verify they're accessible:

1. Check build logs in Vercel
2. Use health endpoints (if available):
   - `/api/_health`
   - `/api/_health/supabase-admin`

---

## Security Notes

- `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security (RLS)
- Always use the admin client (`@/lib/supabase/admin`) only in server-side code
- The `server-only` package and ESLint rules prevent accidental client-side usage
- Client code should use the regular Supabase client with RLS

