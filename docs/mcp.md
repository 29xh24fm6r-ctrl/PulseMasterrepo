# Pulse Omega MCP Server

## Overview

The Pulse Omega MCP Server provides external LLMs (Claude, ChatGPT) with **read-only observability** into Omega Prime's internals.

## Security Model

### MCP Has ZERO Authority

- **No service role access** — uses anon key only (+ optional viewer JWT for RLS)
- **No direct execution** — cannot trigger actions
- **No mutations** — except proposals (see below)
- **All outputs are advisory** — Guardian + human make decisions
- **userId required** — all user-scoped queries require explicit userId

### The Only Write Path

MCP can insert rows into `pulse_improvements` with:
- `status = "proposed"` (always)
- `user_id = <provided userId>` (real user ID, not hardcoded)
- `guardian_review.proposed_by = "mcp_external_llm"`
- `guardian_review.source = "mcp"`
- `guardian_review.requires_human_approval = true`

These proposals appear in the Omega Dashboard for human review. They are **never auto-applied**.

### Why This Matters

Omega Prime is built on earned trust:
1. **Guardian is authoritative** — enforces constraints
2. **Autonomy is earned** — through calibrated confidence
3. **Humans approve** — especially external proposals

MCP cannot bypass this. It observes. It proposes. Guardian + human decide.

## Viewer JWT Setup (RLS Authentication)

MCP reads are constrained by Supabase Row Level Security (RLS). Without authentication, queries may return empty results.

### Setting Up MCP_VIEWER_JWT

1. **Get a Supabase Auth JWT** for the user whose data you want to access
2. Set the environment variable:
   ```bash
   export MCP_VIEWER_JWT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   ```
3. The MCP server will include this JWT in the Authorization header

### Without MCP_VIEWER_JWT

- MCP will fall back to anon key only
- RLS policies will restrict access
- Queries may return empty results
- A warning will be logged at startup

## Canonical Response Envelope

All tool responses use a deterministic envelope format:

```json
{
  "_canon": {
    "mode": "observer_only",
    "authority": "none",
    "write_paths": ["pulse_improvements:proposed_only"],
    "timestamp": "2024-01-26T12:00:00.000Z"
  },
  "result": { ... }
}
```

Error responses:

```json
{
  "_canon": { ... },
  "error": {
    "code": "USER_ID_REQUIRED",
    "message": "userId is required"
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `USER_ID_REQUIRED` | userId parameter missing for user-scoped operation |
| `TABLE_NOT_ALLOWED` | Table not in allowlist |
| `COLUMN_NOT_ALLOWED` | Column not in safeColumns |
| `RATE_LIMIT` | Rate limit exceeded (30/min per tool) |
| `QUERY_FAILED` | Database query failed |
| `INVALID_INPUT` | Invalid tool parameters |
| `INTERNAL_ERROR` | Unexpected error |

## Resources (Read-Only)

| URI | Description | User-Scoped |
|-----|-------------|-------------|
| `omega://schema` | Database schema (static snapshot) | No |
| `omega://constraints` | Guardian constraints | No (global) |
| `omega://autonomy-levels` | Autonomy level definitions | No (global) |

**Note:** User-scoped data is accessed via tools (not resources) to enforce userId requirement.

## Tools

### Observation Tools (userId REQUIRED)

| Tool | Description |
|------|-------------|
| `omega_query` | Query allowlisted tables (max 200 rows, safeColumns enforced) |
| `omega_get_state` | Get current state: drafts, goals, signals |
| `omega_health_report` | System health summary |
| `omega_risk_report` | Risk analysis and recommendations |
| `omega_analyze_calibration` | Confidence calibration analysis |
| `omega_get_reasoning_chain` | Full reasoning trace for a session |

### Proposal Tool (userId REQUIRED)

| Tool | Description |
|------|-------------|
| `omega_propose_improvement` | Submit improvement for human review |

### Analysis Tool (No database access)

| Tool | Description |
|------|-------------|
| `omega_simulate_impact` | Analyze potential change impact (local computation only) |

## Safe Columns

Each table has a `safeColumns` list that excludes large JSON blobs:

- **Allowed**: `id`, `user_id`, `status`, `created_at`, etc.
- **Blocked**: `payload`, `content`, `reasoning_steps`, `context_snapshot`, etc.

The `omega_query` tool:
- Defaults to `safeColumns` when `select` is omitted or `"*"`
- Validates requested columns against `safeColumns`
- Blocks filters on non-safe columns

## Global vs User-Scoped Tables

### Global Tables (no userId required)

- `pulse_constraints`
- `pulse_autonomy_levels`

### User-Scoped Tables (userId REQUIRED)

All other tables require `userId` parameter. Queries without `userId` will return `USER_ID_REQUIRED` error.

## Rate Limits

- 30 requests per tool per minute
- All requests are audit logged

## Usage

Start the server:
```bash
npm run mcp
```

The server communicates via stdio (standard MCP protocol).

### Example Tool Calls

```json
// Get user state
{
  "tool": "omega_get_state",
  "arguments": {
    "userId": "user_abc123"
  }
}

// Query with filters
{
  "tool": "omega_query",
  "arguments": {
    "table": "pulse_drafts",
    "userId": "user_abc123",
    "filters": { "status": "pending_review" },
    "limit": 50
  }
}

// Propose improvement
{
  "tool": "omega_propose_improvement",
  "arguments": {
    "userId": "user_abc123",
    "improvementType": "threshold_change",
    "targetComponent": "guardian",
    "proposedChange": { "confidence_threshold": 0.75 },
    "expectedImpact": "Reduce false positives by 15%"
  }
}
```

## Acceptance Checklist

When testing the MCP server:

1. ✅ Run `npm run mcp`
2. ✅ Call `omega_health_report` with `userId` — returns non-empty envelope
3. ✅ Call `omega_query` on allowlisted table with `userId` filter
4. ✅ Call `omega_propose_improvement` with `userId` — inserts proposal with `status=proposed`
5. ✅ Confirm service role key is not referenced anywhere

## Hard Constraints

The MCP server will NEVER:

- Execute actions
- Send signals
- Modify autonomy
- Bypass Guardian
- Auto-apply improvements
- Access filesystem
- Use service role key
- Query without userId (except global tables)

---

**MCP observes. MCP proposes. Guardian + human decide.**
