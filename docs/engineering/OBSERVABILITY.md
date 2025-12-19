# Runtime Observability

## Overview

Pulse uses structured JSON logging with request IDs and route timing for production observability.

## Features

- ✅ **Request IDs** - Every request gets a unique ID propagated via headers
- ✅ **Structured Logs** - JSON-formatted logs for log aggregation systems
- ✅ **Route Timing** - Automatic latency measurement per route
- ✅ **Request Context** - User agent, referer, and other metadata captured

## Request IDs

### Middleware Integration

The `middleware.ts` file automatically:
- Generates a UUID for each request (if not present)
- Propagates `x-request-id` header to all downstream requests
- Ensures request ID is available in all route handlers

### Usage in Routes

```typescript
import { getRequestMeta } from "@/lib/obs/request-context";

export async function POST(req: Request) {
  const meta = getRequestMeta();
  // meta.requestId is available
  // meta.userAgent, meta.referer also available
}
```

## Structured Logging

### Logger API

```typescript
import { log } from "@/lib/obs/logger";

log.debug("message", { field: "value" });
log.info("message", { field: "value" });
log.warn("message", { field: "value" });
log.error("message", { field: "value" });
```

### Log Format

All logs are single-line JSON:

```json
{"ts":"2025-01-20T12:34:56.789Z","level":"info","message":"route.start","requestId":"abc-123","route":"POST /api/admin/scheduler/golden-path"}
```

### Route Logging Pattern

Standard pattern for all routes:

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
    log.error("route.err", { ...meta, route: "POST /api/...", ms: Date.now() - t0, error: e?.message || String(e) });
    return Response.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
```

## Log Aggregation

### Development

Logs print to console as JSON (single-line for easy parsing).

### Production

Logs can be:
- Collected by log aggregation services (Datadog, LogRocket, etc.)
- Parsed by log drains (Vercel, Railway, etc.)
- Indexed by log search tools (ELK, Splunk, etc.)

### Querying Logs

Example queries (format depends on your log system):

```
# Find all errors for a specific request
requestId:abc-123 AND level:error

# Find slow routes (>1000ms)
ms:>1000

# Find all routes for a specific endpoint
route:"POST /api/admin/scheduler/golden-path"
```

## Best Practices

1. **Always include request context** - Use `getRequestMeta()` for consistent fields
2. **Measure timing** - Use `Date.now()` to track route latency
3. **Log errors with context** - Include error messages and stack traces
4. **Use appropriate log levels** - `debug` for verbose, `info` for normal, `warn` for issues, `error` for failures
5. **Keep logs structured** - Always use the logger, never `console.log` directly

## Current Coverage

Routes with observability:
- ✅ `POST /api/admin/scheduler/golden-path`
- ✅ `POST /api/scheduler/run-health`

**Next:** Add observability to top 5 critical routes:
- `POST /api/jobs/*` (job queue operations)
- `POST /api/intelligence/*` (intelligence gathering)
- `POST /api/contacts/*` (contact operations)
- `POST /api/deals/*` (deal operations)

## Performance

- **Minimal overhead** - Request ID generation is fast (crypto.randomUUID)
- **No blocking** - Logging is async-friendly
- **Production-safe** - Logs are lightweight JSON strings

