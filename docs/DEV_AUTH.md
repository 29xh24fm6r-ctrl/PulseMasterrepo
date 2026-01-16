# Dev Auth (Antigravity) — Canonicalization & Self-Heal

## Purpose
Pulse development auth uses an intentionally simple “dev bypass” to unblock local/preview work without a full production identity provider.

**Core invariant:** the **server** is the canonical source of truth for the dev `userId`.  
The client **never invents** a dev identity; it only **syncs** to what the server authorizes.

This eliminates the “Auth Missing” loop by ensuring missing identity can self-heal safely.

---

## Concepts & Sources of Truth

### Canonical userId
- **Canonical authority:** `POST /api/dev/bootstrap`
- **Client storage:** `localStorage["pulse_owner_user_id"]` (used by the app/client auth layer)
- **Middleware bypass cookie:** `x-pulse-dev-user-id` (used to allow dev access at the edge/middleware layer)

**Rule:** If the client is missing `pulse_owner_user_id`, it must fetch the canonical `userId` from the server bootstrap endpoint.

---

## Files & Responsibilities

### Server bootstrap endpoint
**File:** `app/api/dev/bootstrap/route.ts`

Responsibilities:
- Derive dev `userId` from **server-side** configuration (env/cookie/middleware rules).
- Return JSON:
  ```json
  { "ok": true, "userId": "..." }
  ```
- Set header:
  * `Cache-Control: no-store` (on success AND error)
- Set dev bypass cookie:
  * `x-pulse-dev-user-id=<userId>` (httpOnly, sameSite=lax, secure only in production)

**Non-goals:**
- This endpoint is **not** production auth.
- It must **never** accept an identity from client input.

---

### Client auto-heal bootstrap

**File:** `lib/auth/devBootstrap.ts`

Responsibilities:
- If `localStorage["pulse_owner_user_id"]` is missing, attempt a one-time self-heal:
  1. Check dev gate (only run when dev bypass is intended)
  2. Check `sessionStorage["__dev_bootstrap_attempted"]` to prevent loops
  3. Call `POST /api/dev/bootstrap`
  4. Store returned `userId` in localStorage
  5. Reload once

Hardening:
- `sessionStorage["__dev_bootstrap_attempted"]` is set **before** the fetch to prevent infinite reload loops.

---

### UI emergency recovery

**File:** `components/bridge/states/AuthMissing.tsx`

Responsibilities:
- “Set Dev User & Reload” must:
  1. Call `POST /api/dev/bootstrap`
  2. Store returned `userId` into localStorage
  3. Reload

**Rule:** No env/local guesswork. The server response is authoritative.

---

### Provider integration

**File:** `app/providers.tsx`

Responsibilities:
- Call `devBootstrapPulseOwnerUserId()` from `useEffect` on mount (client-only).

---

## Keys / Identifiers

* Local storage key:
  * `pulse_owner_user_id`
* Session storage guard:
  * `__dev_bootstrap_attempted`
* Dev bypass cookie:
  * `x-pulse-dev-user-id`

---

## Expected Behavior

### Fresh session (no localStorage key)
1. App loads
2. `devBootstrapPulseOwnerUserId()` runs
3. Calls `POST /api/dev/bootstrap`
4. Saves `pulse_owner_user_id`
5. Reloads once
6. App loads normally (no “Auth Missing” loop)

### If auto-heal fails
- No reload loop occurs (guard prevents repeated attempts)
- User can click “Set Dev User & Reload” to recover manually

---

## How to Reset Dev Auth (Manual)

1. Clear local storage:
   * Remove `pulse_owner_user_id`
2. Reload the page
3. If needed, click “Set Dev User & Reload”

To fully reset the one-shot guard for the current tab/session:
* Close the tab (or clear `sessionStorage["__dev_bootstrap_attempted"]`)

---

## Safety & Deployment Notes

* `/api/dev/bootstrap` is intended for **dev/preview only**.
* Production deployments should not enable dev bypass configuration.
* Do not expand this into production auth. When production auth is implemented, this path should be disabled or removed.

---

## Definition of Done

* Clearing `pulse_owner_user_id` cannot produce an “Auth Missing” loop.
* Server is the sole source of dev `userId`.
* Client self-heals safely once per session.
* Emergency button recovers via the canonical API path.
