# Production-Only Clerk Auth (Option A)

## Overview
Pulse OS uses a **Strict Production Auth** model. Clerk authentication is **only** enabled on the canonical production domain (`app.pulselifeos.com`) and local development (`localhost`).

Vercel Preview deployments (`*.vercel.app`) have authentication **continuously disabled**. They must never receive production Clerk keys (`pk_live_...`). This prevents "Production keys are only allowed for domain..." errors and keeps the preview environment stable for UI testing.

## Canonical Domains
- **App**: `https://app.pulselifeos.com` (Production Auth ✅)
- **Marketing**: `https://www.pulselifeos.com` (Production Auth ✅)
- **Accounts**: `https://accounts.pulselifeos.com` (Hosted Pages)
- **Clerk API**: `https://clerk.pulselifeos.com`

## Vercel Configuration Rules

### Production Environment
- **Must Have**:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (Live)
  - `CLERK_SECRET_KEY` (Live)
  - `NEXT_PUBLIC_CLERK_SIGN_IN_URL` = `https://accounts.pulselifeos.com/sign-in`
  - `NEXT_PUBLIC_CLERK_SIGN_UP_URL` = `https://accounts.pulselifeos.com/sign-up`
  - `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` = `https://app.pulselifeos.com/`

### Preview Environment
- **MUST NOT Have**:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (Live or Test)
  - `CLERK_SECRET_KEY`
- **Behavior**:
  - The application detects the missing keys and/or the `*.vercel.app` hostname.
  - It renders a "Preview Deployment: Auth Disabled" banner.
  - No infinite reload loops. No console errors.

## Codebase Guards

### 1. Client-Side (`ClerkProviderSafe.tsx`)
The `ClerkProviderSafe` component strictly checks `window.location.hostname` against `lib/auth/canonicalHosts.ts`.
- **Allowed**: `app.pulselifeos.com`, `localhost`
- **Blocked**: `*.vercel.app` (Preview)

If blocked, it **does not render ClerkProvider** at all. Instead, it renders a `PreviewAuthDisabledBanner` and the children in a "Guest" context.

### 2. Middleware (`middleware.ts`)
The middleware enforces a strict "No Keys = No Auth" policy.
- If Clerk keys are missing (Preview), it **Rewrites** all protected routes (`/app`, `/bridge`, etc.) to `/auth-disabled`.
- This prevents the application from attempting to render components that rely on `useUser()` or `useAuth()`, effectively preventing crashes.
- Public routes (landing page, assets) continue to function normally.

## Troubleshooting
**"Production keys are only allowed for domain..."**
- You are likely viewing a Preview URL (`git-hash.vercel.app`) that accidentally has `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` set to a generic value or leaked production key.
- **Fix**: Run `npm run verify:clerk:preview` to check for leaks. Remove the Clerk variables from the Vercel "Preview" environment.

**"Auth Disabled" Page**
- This is the expected behavior for Preview environments trying to access app routes.
- To test Auth, use `app.pulselifeos.com`.
