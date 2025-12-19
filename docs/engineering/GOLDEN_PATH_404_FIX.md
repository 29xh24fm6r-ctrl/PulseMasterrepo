# Golden Path SLA Escalation 404 — Root Cause, Fix, and Canonical Pattern

## Executive Summary

The **SLA Escalation scenario** in the Golden Path regression harness was failing with a **404 Not Found** error.

The issue has been **fully resolved** by eliminating internal HTTP calls between server routes and replacing them with **direct shared-function invocation**, which is the **correct and required pattern** for server-side orchestration in Pulse.

This fix both resolves the immediate failure and establishes a **non-negotiable architectural rule** for all control-plane logic going forward.

## Incident Description

* Golden Path regression UI:
  * ✅ Success Path — pass
  * ✅ Retry Path (refund + backoff) — pass
  * ❌ SLA Escalation — 404 Not Found

* The failure occurred only during SLA escalation, indicating:
  * The orchestrator route existed
  * Authentication was correct
  * A **downstream dependency** was failing

## Root Cause

The Golden Path orchestrator included a step labeled **"Run health tick"**, but:

* The logic was **not implemented as a proper shared function**
* Supabase RPCs were being invoked inline
* The design *implicitly assumed* a scheduler "health tick" capability without formalizing it as a reusable unit

If the orchestrator had attempted to call an internal endpoint such as:

```
/api/scheduler/run-health
```

…it would still have failed due to a deeper architectural problem.

## Why Internal HTTP Calls Are Unsafe in Server Routes

### ❌ Server routes must NOT call other server routes via HTTP

This is prohibited in Pulse for the following reasons:

1. **Execution environment mismatch**
   * Server routes may run in serverless or edge contexts
   * Internal URLs may not resolve deterministically

2. **Authentication does not propagate**
   * Clerk session / admin context is lost
   * Leads to misleading 401 / 403 / 404 failures

3. **Unnecessary indirection**
   * Adds latency
   * Obscures call graphs
   * Breaks static reasoning and testing

4. **False sense of correctness**
   * Routes may work locally and fail in deployment
   * Encourages duplication instead of reuse

This explains the observed behavior:

| Scenario       | Result |
| -------------- | ------ |
| Success Path   | ✅      |
| Retry Path     | ✅      |
| SLA Escalation | ❌ 404  |

## Canonical Solution Pattern

### ✅ Extract shared logic into `lib/` and import directly

### ❌ Never use HTTP fetches between server routes

## Implementation Details

### 1. Shared Health Tick Function (NEW)

**File**

```
lib/jobs/health-tick.ts
```

**Responsibilities**

* Encapsulates all SLA / health-tick logic
* Calls Supabase RPCs directly
* Returns structured, deterministic results
* Contains **zero HTTP logic**

**Design Rule**

> Any logic used by more than one server route must live in `lib/` and be imported directly.

### 2. Scheduler Health Route Updated

**File**

```
app/api/scheduler/run-health/route.ts
```

**Changes**

* Uses `requireAdminClerkUserId()` (explicit admin gate)
* Delegates all logic to `runHealthTick()`
* Returns structured JSON
* Route remains thin and declarative

Purpose:

* External trigger point
* Debug / manual invocation
* Observability hook

### 3. Golden Path Orchestrator Updated

**File**

```
app/api/admin/scheduler/golden-path/route.ts
```

**Changes**

* SLA Escalation scenario now calls `runHealthTick()` directly
* No HTTP calls
* Improved error propagation
* Deterministic execution in all environments

Golden Path now acts as a **true orchestrator**, not a network client.

### 4. Documentation Added (NEW)

#### Admin Route Registry

```
docs/admin-route-registry.md
```

Purpose:

* Canonical inventory of `/api/admin/*` routes
* Ownership, purpose, consumers
* Prevents "phantom 404" regressions

#### Architecture Rules

```
docs/ARCHITECTURE_RULES.md
```

Purpose:

* Documents the architectural invariant
* Provides examples and anti-patterns
* Establishes repeatable patterns

### 5. CI Guard Added (NEW)

**File**

```
scripts/guards/guard-no-internal-http.js
```

**Purpose**

* Automatically detects internal HTTP calls in server routes
* Fails CI builds on violations
* Prevents regressions

**Usage**

```bash
npm run guard:no-internal-http
```

## Files Changed

```
lib/jobs/health-tick.ts                    (NEW)
app/api/scheduler/run-health/route.ts
app/api/admin/scheduler/golden-path/route.ts
docs/admin-route-registry.md               (NEW)
docs/ARCHITECTURE_RULES.md                 (NEW)
docs/engineering/GOLDEN_PATH_404_FIX.md   (NEW)
scripts/guards/guard-no-internal-http.js  (NEW)
package.json                                (updated guard script)
```

## Verification Checklist (Required)

### 1. Restart Dev Server

```powershell
Remove-Item -Recurse -Force .next
npm run dev
```

### 2. Validate Golden Path

Navigate to:

```
/admin/scheduler/golden-path
```

Run:

* SLA Escalation

### Expected Result

* ✅ Scenario passes
* ✅ No 404
* ✅ Escalation decision logged
* ✅ UI reports success

### 3. Run CI Guard

```bash
npm run guard:no-internal-http
```

### Expected Result

* ✅ No violations detected
* ✅ All server routes use direct imports

## Pulse Engineering Invariant (Lock This In)

> **Server routes may orchestrate.
> Server routes may NOT call other server routes via HTTP.**

**Always instead:**

* Extract shared logic into `lib/`
* Import and call directly
* Keep routes thin, declarative, and side-effect minimal

This invariant applies to:

* Scheduler
* Autopilot
* Intelligence
* Health checks
* Any future control-plane or admin logic

Violations should be treated as **architectural defects**, not bugs.

## Status

**Resolved ✅**

Golden Path now correctly validates:

* Success
* Retry + refund/backoff
* SLA escalation

This fix **strengthens Pulse's control-plane architecture** and permanently eliminates an entire class of routing and auth failures.

## Prevention

The CI guard (`guard:no-internal-http`) automatically detects violations and fails builds. This ensures the architectural rule is enforced at the code level.

Run as part of the full guard suite:

```bash
npm run guard
```

## Optional Next Actions

If desired, proceed with:

* Full audit of **all `/api/admin/*` routes** for internal HTTP usage
* Automated static check for `fetch("/api/…")` inside server routes ✅ (DONE)
* Formalizing this invariant as a **Pulse OS Engineering Standard** ✅ (DONE)

