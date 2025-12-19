# Admin Route Registry

This document lists all `/api/admin/...` routes and their consumers.

## Routes

### `/api/admin/scheduler/golden-path`
- **Method**: `POST`
- **Auth**: `requireAdminClerkUserId()` (via `lib/auth/admin.ts`)
- **Payload**: `{ scenario: "all" | "success" | "retry" | "sla" }`
- **Response**: `{ ok: boolean, scenario: string, results: ScenarioResult[] }`
- **Consumers**:
  - `app/admin/scheduler/golden-path/page.tsx` (UI)
- **Downstream Calls**:
  - Calls `runSchedulerHealthTick()` from `lib/jobs/health-tick.ts` (direct function import, NOT HTTP)
  - Direct Supabase RPC calls: `job_queue_lease_any_c7`, `job_queue_complete_c8`, `job_queue_sla_escalate_c9`

### `/api/admin/stats`
- **Method**: `GET`
- **Auth**: `requireAdminClerkUserId()`
- **Response**: `{ ok: true, message: "Admin access granted" }`
- **Consumers**: Admin dashboard (test endpoint)

### `/api/scheduler/run-health`
- **Method**: `POST`
- **Auth**: `requireAdminClerkUserId()` (admin-only)
- **Response**: `{ ok: boolean }`
- **Consumers**:
  - External: Cron jobs, manual triggers
  - Internal: Uses shared `runSchedulerHealthTick()` function (not called via HTTP by golden path)
- **Functionality**:
  - Computes job queue health snapshot
  - Runs SLA escalation
  - Runs provider health tick (C10)

### `/api/scheduler/admin/*`
- **Methods**: `GET`, `POST` (varies by route)
- **Auth**: `requireAdmin()` (legacy - should migrate to `requireAdminClerkUserId()`)
- **Routes**:
  - `/api/scheduler/admin/health` - GET health snapshots
  - `/api/scheduler/admin/decisions` - GET scheduler decisions
  - `/api/scheduler/admin/credits` - GET credit balances/ledger
  - `/api/scheduler/admin/grant-credits` - POST grant credits
  - `/api/scheduler/admin/sla-escalate` - POST trigger SLA escalation

## Notes

- All admin routes should use `requireAdminClerkUserId()` from `lib/auth/admin.ts`
- Routes should return consistent JSON: `{ ok: boolean, ... }`
- Error responses: `{ ok: false, error: string }`
- Status codes: 200 for success, 401/403 for auth failures, 500 for server errors

