# Pulse Canonical Invariant: Authentication & Hostnames

> **Invariant: Authentication may ONLY run on canonical domains.**

## Rules

1.  **`*.vercel.app` is ALWAYS treated as Preview.**
    *   Regardless of the `VERCEL_ENV` variable.
    *   Regardless of whether Production keys are present.
    *   Traffic to these domains is effectively sandboxed.

2.  **ClerkProvider must NEVER mount on `*.vercel.app`.**
    *   The application shell must detect the hostname and refuse to instantiate the Clerk SDK.
    *   This prevents "Publishable Key" errors and "Session" mismatches.

3.  **Middleware enforces this invariant upstream.**
    *   Middleware intercepts all requests.
    *   If the Host header ends in `.vercel.app`, the request is either:
        *   Allowed (if it's a public asset like `manifest.json`).
        *   Rewritten to `/auth-disabled` (if it's an application route).
    *   **Clerk Middleware is NOT executed** for these requests.

4.  **Production env vars do NOT override hostname-based auth rules.**
    *   Even if a developer accidentally copies `pk_live_...` to a Preview environment, the hostname check prevents its usage.

## Rationale

Vercel automatically attaches `*.vercel.app` system domains to every deployment, including Production. However, Clerk authentication is often strict about "Allowed Origins". Relying on Environment variables alone is unsafe because:
*   Vercel environments can optionally have "Production" env vars enabled (Preview vs Production).
*   System domains (`project-git-branch.vercel.app`) exist in a gray area.
*   `useUser()` hooks in client components will crash the entire application if Clerk is not loaded, causing White Screen of Death.

By enforcing a **Hostname-based Lock**, we guarantee that the application behaves deterministically based on *how it is accessed*, protecting the integrity of the user session and preventing confusing access errors.
