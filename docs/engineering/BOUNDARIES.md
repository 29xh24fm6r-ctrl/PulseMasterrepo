# Pulse OS Boundaries: Client vs Server (Non-Negotiable)

This repo uses strict boundaries to prevent accidental leakage of server-only code into client bundles.

These rules are enforced by CI guards.

## Golden Rule

- **Client components must never import server-only modules**

- Server-only code must be accessed via:

  - **Route handlers** (`app/api/**/route.ts`)

  - **Server components**

  - **Server entrypoints** (`lib/**/server.ts`)

## Required Structure (Enforced)

### `lib/**/index.ts`

- **Client-safe only**

- Export:

  - Types

  - Constants safe for client

  - Pure utilities that do not touch auth/headers/cookies/DB



**Never include**:

- `import "server-only"`

- `@clerk/nextjs/server`

- `next/headers`

- `cookies()`, `headers()`



### `lib/**/server.ts`

- **Server-only entrypoint**

- Must start with:

  - `import "server-only";`

- May import:

  - `@clerk/nextjs/server`

  - `next/headers`

  - DB clients/admin

  - job queue processors

  - orchestrators / kernels



## How the UI accesses server-only data



Client components call API routes:

- Client (`"use client"`) → `fetch("/api/...")` → server route handler → `lib/**/server.ts`



## Guards (CI)



### Guard: server-only leaks

- Fails if any client component can reach forbidden server-only tokens via imports.

- Script: `scripts/find-server-only-leaks.mjs`



### Guard: no mixed barrels

- Fails if any `lib/**/index.ts(x)` contains server-only tokens.

- Script: `scripts/guard-no-mixed-barrels.mjs`



### Guard: server-only convention

- Fails if `import "server-only"` appears outside approved locations.

- Script: `scripts/guard-server-only-convention.mjs`



## Quick Fix Patterns



### "Server-only imported by client" error

- Move implementation to `lib/<module>/server.ts`

- Create API route wrapper

- Client calls API route, imports only types



### "Barrel leaks server-only"

- Remove server-only exports from `index.ts`

- Add `server.ts` and update server imports to use it

