# Pulse MCP — Claude Integration Setup

## Cloud Run Base URL

```
https://pulse-mcp-<your-hash>.run.app
```

## Required Headers (all `/call` requests)

| Header | Value | Description |
|--------|-------|-------------|
| `x-pulse-mcp-key` | `<PULSE_MCP_API_KEY>` | Auth key |
| `x-pulse-mcp-agent` | `claude` / `gemini` / `internal` | Calling agent |
| `x-pulse-mcp-scope` | `read` / `plan` / `simulate` / `propose` / `execute` | Requested scope |
| `x-pulse-nonce` | unique string (8+ chars) | Replay protection |
| `x-pulse-ts` | `Date.now()` (ms epoch) | Timestamp (30s drift max) |

## Request Body Shape

```json
{
  "call_id": "unique-call-id",
  "tool": "mcp.tick",
  "intent": "what this call is for",
  "inputs": {}
}
```

## Available Tools

### Diagnostic
- `mcp.tick` — Connectivity round-trip (scope: `read`)

### Read
- `observer.query` — Query observer events (scope: `read`)
- `state.inspect` — Composite state snapshot (scope: `read`)
- `state.signals` — List recent signals (scope: `read`)
- `state.drafts` — List recent drafts (scope: `read`)
- `state.outcomes` — List recent outcomes (scope: `read`)
- `state.confidence` — List confidence events (scope: `read`)

### Simulate
- `plan.simulate` — Simulate a plan without side effects (scope: `simulate`)

### Propose (returns 202 + persists proposal for human approval)
- `plan.propose` — Propose a plan (scope: `propose`)
- `plan.propose_patch` — Propose a plan patch (scope: `propose`)
- `state.propose_patch` — Propose a state change (scope: `propose`)
- `action.propose` — Propose an action (scope: `propose`)

### Execute
- `action.execute` — Execute an approved action (scope: `execute`, min confidence: 0.85)

## Example: Diagnostic Tick

```bash
curl -X POST https://pulse-mcp-<hash>.run.app/call \
  -H "Content-Type: application/json" \
  -H "x-pulse-mcp-key: YOUR_KEY" \
  -H "x-pulse-mcp-agent: claude" \
  -H "x-pulse-mcp-scope: read" \
  -H "x-pulse-nonce: test-$(date +%s)" \
  -H "x-pulse-ts: $(date +%s000)" \
  -d '{
    "call_id": "tick-001",
    "tool": "mcp.tick",
    "intent": "connectivity_check",
    "inputs": { "hello": "omega" }
  }'
```

Expected response (200):
```json
{
  "call_id": "tick-001",
  "status": "executed",
  "confidence": 1.0,
  "result": {
    "summary": "Omega Gate round-trip OK",
    "artifacts": [{ "ok": true, "service": "pulse-mcp", "echo": { "hello": "omega" }, "server_time": "..." }]
  },
  "audit_ref": "<effect-uuid>"
}
```

## Example: Propose an Action

```bash
curl -X POST https://pulse-mcp-<hash>.run.app/call \
  -H "Content-Type: application/json" \
  -H "x-pulse-mcp-key: YOUR_KEY" \
  -H "x-pulse-mcp-agent: claude" \
  -H "x-pulse-mcp-scope: propose" \
  -H "x-pulse-nonce: propose-$(date +%s)" \
  -H "x-pulse-ts: $(date +%s000)" \
  -d '{
    "call_id": "propose-001",
    "tool": "action.propose",
    "intent": "Schedule weekly review for Sunday 6pm",
    "inputs": {
      "action_type": "schedule_event",
      "params": { "title": "Weekly Review", "day": "sunday", "time": "18:00" },
      "summary": "Create a recurring weekly review event"
    }
  }'
```

Expected response (202):
```json
{
  "call_id": "propose-001",
  "status": "proposed",
  "proposal_id": "<proposal-uuid>",
  "confidence": 0.8,
  "result": { "summary": "Action proposal: ...", "artifacts": [...] },
  "audit_ref": "<effect-uuid>"
}
```

The proposal appears in the Approvals inbox at `/approvals`.

## Troubleshooting

| Status | Error | Fix |
|--------|-------|-----|
| 401 | Invalid key | Check `x-pulse-mcp-key` |
| 400 | Invalid agent/scope/nonce | Check header format |
| 403 | Timestamp drift | Ensure `x-pulse-ts` is within 30s of server time |
| 403 | Scope not authorized | Tool requires different scope |
| 404 | Tool not in allowlist | Check tool name against list above |
| 409 | Replay detected | Use a unique nonce per call |
