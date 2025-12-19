# Quick Start - Bulletproof Foundation

## All Three Sprints Complete ✅

### 1. API Contract Strict Mode

**What it does:** CI fails if new/changed routes don't have registered contracts.

**Add a contract:**
1. Create contract in `lib/contracts/[domain].contracts.ts`
2. Register in `lib/contracts/registry.ts`
3. Apply to route using `parseJsonBody` and `validateResponse`

**Check:**
```bash
npm run contracts:strict
```

### 2. Runtime Observability

**What it does:** Structured JSON logs with request IDs and route timing.

**Add to a route:**
```typescript
import { log } from "@/lib/obs/logger";
import { getRequestMeta } from "@/lib/obs/request-context";

export async function POST(req: Request) {
  const meta = getRequestMeta();
  const t0 = Date.now();
  log.info("route.start", { ...meta, route: "POST /api/..." });
  
  try {
    // ... route logic ...
    log.info("route.ok", { ...meta, route: "POST /api/...", ms: Date.now() - t0 });
    return Response.json({ ok: true });
  } catch (e: any) {
    log.error("route.err", { ...meta, route: "POST /api/...", ms: Date.now() - t0, error: e?.message });
    return Response.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
```

### 3. DB Migration Safety

**What it does:** CI fails if schema changes don't have migrations, or if migrations aren't timestamped/risky.

**Create a migration:**
1. Create file: `supabase/migrations/YYYYMMDD_description.sql`
2. If risky (DROP, TRUNCATE), add: `-- ALLOW_RISKY_MIGRATION`

**Check:**
```bash
npm run migrations:check
```

## Verification

All checks pass:
```bash
npm run contracts:strict    # ✅
npm run migrations:check     # ✅ (may show warnings for old migrations, but new ones are checked)
npm run guard:no-internal-http # ✅
```

## CI Integration

All checks run automatically in CI on every PR/push.

## Documentation

- `docs/engineering/CONTRACTS.md` - Contract guide
- `docs/engineering/OBSERVABILITY.md` - Observability guide
- `docs/engineering/MIGRATIONS.md` - Migration safety guide

