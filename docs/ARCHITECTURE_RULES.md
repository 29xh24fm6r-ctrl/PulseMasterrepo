# Pulse OS Architecture Rules

## Server Route Orchestration

### ✅ DO: Extract shared logic into `lib/`

**Pattern:**
```typescript
// lib/jobs/health-tick.ts
export async function runSchedulerHealthTick() {
  // Shared logic here
}

// app/api/admin/scheduler/golden-path/route.ts
import { runSchedulerHealthTick } from "@/lib/jobs/health-tick";
const result = await runSchedulerHealthTick();
```

### ❌ DON'T: Call other server routes via HTTP

**Anti-pattern:**
```typescript
// ❌ BAD: Server route calling itself via HTTP
const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/scheduler/run-health`, {
  method: "POST",
});
```

**Why this fails:**
1. **Server routes should not call themselves via HTTP**
   - Causes unnecessary indirection
   - Breaks in serverless / edge environments
2. **Auth headers do not automatically propagate**
   - Clerk session / admin context is lost
   - Leads to misleading 401/403/404 failures
3. **Path resolution is unreliable**
   - Relative URLs may not resolve
   - Environment differences cause silent failures

### When to use HTTP vs Direct Import

| Scenario | Approach | Example |
|----------|----------|---------|
| Server route needs logic from another route | **Direct import** | `import { runSchedulerHealthTick } from "@/lib/jobs/health-tick"` |
| External system needs to trigger logic | **HTTP endpoint** | Cron job calls `/api/scheduler/run-health` |
| Client needs to trigger server logic | **HTTP endpoint** | UI calls `/api/admin/scheduler/golden-path` |
| Route needs external API | **HTTP fetch** | Call Twilio, OpenAI, etc. |

## Admin Route Standards

### Auth Gate

**All admin routes must use:**
```typescript
import { requireAdminClerkUserId } from "@/lib/auth/admin";

export async function POST() {
  await requireAdminClerkUserId();
  // ... route logic
}
```

### Response Format

**Success:**
```typescript
return NextResponse.json({ ok: true, ...data });
```

**Error:**
```typescript
return NextResponse.json({ ok: false, error: "message" }, { status: 500 });
```

**Handle Response objects:**
```typescript
catch (e: any) {
  if (e instanceof Response) return e;
  return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
}
```

## File Organization

### `lib/` Structure

- `lib/jobs/` - Job queue logic
- `lib/auth/` - Authentication helpers
- `lib/supabase/` - Database clients
- `lib/[domain]/` - Domain-specific logic

### Route Organization

- `app/api/admin/*` - Admin-only routes
- `app/api/scheduler/*` - Scheduler routes (may be admin or user-scoped)
- `app/api/[domain]/*` - Feature-specific routes

## Testing

### Golden Path Tests

All critical orchestration flows should have golden path tests:
- Success scenarios
- Retry scenarios
- Error scenarios
- SLA escalation scenarios

See: `app/admin/scheduler/golden-path/page.tsx`

## Documentation

### Route Registry

All admin routes must be documented in:
- `docs/admin-route-registry.md`

Include:
- Method
- Auth requirements
- Payload/response contracts
- Consumers
- Downstream dependencies
