# API Contract Harness

## Overview

The contract harness uses **Zod schemas** to validate request and response payloads, preventing API drift and catching breaking changes early.

## Benefits

- ✅ **Prevents silent payload drift** - Catches shape mismatches in dev/test
- ✅ **Type safety** - TypeScript types derived from schemas
- ✅ **Documentation** - Contracts serve as living API documentation
- ✅ **CI enforcement** - Contracts must exist for critical routes

## Architecture

### Contract Structure

```typescript
// lib/contracts/[domain].contracts.ts
export const MyRouteRequest = z.object({
  param1: z.string(),
  param2: z.number().optional(),
});

export const MyRouteResponse = z.object({
  ok: z.literal(true),
  data: z.any(),
});
```

### Route Integration

```typescript
import { MyRouteRequest, MyRouteResponse } from "@/lib/contracts/[domain].contracts";
import { parseJsonBody, validateResponse } from "@/lib/contracts/contract-helpers";

export async function POST(req: Request) {
  // Parse and validate request
  const body = await parseJsonBody(req, MyRouteRequest);
  
  // ... route logic ...
  
  // Validate response before returning
  const payload = { ok: true, data: result };
  const validated = validateResponse(MyRouteResponse, payload);
  return Response.json(validated);
}
```

## Contract Helpers

### `parseJsonBody<T>(req, schema)`

Parses and validates JSON request body against a Zod schema.

**Throws:** `ZodError` if validation fails (should be caught and returned as 400)

### `validateResponse<T>(schema, payload)`

Validates response payload in dev/test. In production, skips validation for performance (unless `ENABLE_STRICT_CONTRACTS` is set).

### `jsonOk(data, init?)`

Returns a successful JSON response: `{ ok: true, ...data }`

### `jsonErr(error, init?)`

Returns an error JSON response: `{ ok: false, error }`

## Current Contracts

### Admin Scheduler Contracts

**File:** `lib/contracts/admin-scheduler.contracts.ts`

- `GoldenPathRequest` - Golden Path test request
- `GoldenPathResponse` - Golden Path test response
- `RunHealthRequest` - Scheduler health tick request
- `RunHealthResponse` - Scheduler health tick response

## CI Enforcement

The `contracts:check` script ensures contract infrastructure exists:

```bash
npm run contracts:check
```

This runs in CI as part of the sentinel job, ensuring contracts are present before deployment.

## Adding New Contracts

1. **Create contract file** (if new domain):
   ```typescript
   // lib/contracts/[domain].contracts.ts
   import "server-only";
   import { z } from "zod";
   
   export const MyRouteRequest = z.object({ ... });
   export const MyRouteResponse = z.object({ ... });
   ```

2. **Apply to route**:
   ```typescript
   import { MyRouteRequest, MyRouteResponse } from "@/lib/contracts/[domain].contracts";
   import { parseJsonBody, validateResponse } from "@/lib/contracts/contract-helpers";
   ```

3. **Update contracts-check.mjs** (if adding new required file):
   ```javascript
   const REQUIRED_FILES = [
     "lib/contracts/contract-helpers.ts",
     "lib/contracts/[domain].contracts.ts", // Add here
   ];
   ```

## Strict Mode (Future)

For stricter enforcement, a `contracts-check-strict.mjs` script can:
- Scan all `app/api/**/route.ts` files
- Require contract imports for server routes
- Allowlist certain routes (webhooks, probes)
- Fail CI if routes lack contracts

To enable strict mode, say "make it strict" and we'll implement it.

## Best Practices

1. **Start with critical routes** - Admin, scheduler, payment flows
2. **Keep schemas flexible** - Use `.optional()`, `.nullable()`, `.any()` where needed
3. **Document breaking changes** - Update contracts when API changes
4. **Test contract validation** - Ensure invalid payloads return 400

## Performance

- **Development/Test**: Full validation enabled
- **Production**: Validation skipped by default (can enable with `ENABLE_STRICT_CONTRACTS=1`)

This ensures contracts catch issues early without impacting production performance.

