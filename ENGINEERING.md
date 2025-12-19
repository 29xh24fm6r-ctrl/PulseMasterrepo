# Pulse OS Engineering

This repo is protected by a "bulletproof foundation" enforced in CI.

## Non-negotiable invariants

### 1) No internal HTTP between server routes

Server routes may orchestrate, but **must not call other server routes via HTTP** (e.g. `fetch("/api/...")` inside server routes).

- Shared logic lives in `lib/` and is imported directly.

### 2) Contracts required for routes

New/changed API routes must have a registered contract (Zod) and pass `npm run contracts:strict`.

### 3) Observability baseline

Critical routes emit structured JSON logs with `requestId` and `ms`.

### 4) Migration discipline

Schema changes must be accompanied by SQL migrations in `supabase/migrations` and pass `npm run migrations:check`.

## Docs

- Quick start: `docs/engineering/QUICK_START.md`
- Foundation summary: `docs/engineering/BULLETPROOF_FOUNDATION.md`
- Contracts: `docs/engineering/CONTRACTS.md`
- Observability: `docs/engineering/OBSERVABILITY.md`
- Migrations: `docs/engineering/MIGRATIONS.md`

## Adding a new API route checklist

1) Add/extend contract + register in `lib/contracts/registry.ts`
2) Add structured logs (`route.start`, `route.ok`, `route.err`)
3) If schema is impacted, add a migration under `supabase/migrations`
4) Ensure CI passes (sentinel job + required check)

