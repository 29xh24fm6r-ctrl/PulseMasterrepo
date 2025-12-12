# Master Brain Registry + Diagnostics v1

## Implementation Status

✅ **COMPLETE** - All phases implemented:

### Database Schema
- ✅ 7 tables created:
  - system_modules (registry of all engines)
  - system_capabilities (specific capabilities within modules)
  - system_module_health (health status per module)
  - system_capability_health (detailed health per capability)
  - system_module_metrics (daily aggregated metrics)
  - system_diagnostics_runs (historic diagnostics runs)
  - system_diagnostics_findings (findings from runs)

### Core Modules
- ✅ `lib/masterbrain/types.ts` - Type definitions
- ✅ `lib/masterbrain/registry.ts` - Module registry with seeding
- ✅ `lib/masterbrain/health.ts` - Health checking engine
- ✅ `lib/masterbrain/diagnostics.ts` - Diagnostics engine
- ✅ `lib/masterbrain/narrator.ts` - System narrator

### API Endpoints
- ✅ `POST /api/masterbrain/diagnostics/run` - Run diagnostics
- ✅ `GET /api/masterbrain/diagnostics/latest` - Get latest diagnostics
- ✅ `GET /api/masterbrain/modules` - List modules with health
- ✅ `GET /api/masterbrain/summary` - Get system narrator summary

### Integration
- ✅ Brain Registry entry added (`master_brain_registry_v1`)

---

## Overview

Master Brain Registry + Diagnostics v1 is a meta-system that:
- **Registers** all major engines/modules in Pulse
- **Tracks health** of each module
- **Runs diagnostics** to detect issues
- **Provides system narrator** for human-readable status

---

## Database Schema

### system_modules
Registry of all major engines:
- key: Unique identifier (e.g., 'mythic_intelligence')
- name: Human-readable name
- category: core, coach, simulation, data, integration
- Seeded with 15+ core modules

### system_capabilities
Specific capabilities within modules:
- Links to modules
- API routes for each capability
- Examples: mythic.story_sessions, boardroom.decisions

### system_module_health
Rolling health status:
- status: ok, degraded, error, disabled
- error_count, avg_latency_ms
- last_check_at

### system_module_metrics
Daily aggregated metrics:
- invocation_count, error_count
- avg_latency_ms
- user_touch_count
- Per module per day

### system_diagnostics_runs
Historic diagnostics runs:
- run_type: daily, manual, post_deploy
- initiated_by: system, user, deploy_hook
- status: in_progress, completed, failed
- summary

### system_diagnostics_findings
Findings from diagnostics:
- severity: info, warning, critical
- category: health, config, usage, data_staleness
- title, description, recommendation

---

## Core Functionality

### Registry

`ensureSystemModulesSeeded()`:
- Seeds 15+ core modules (Mythic, Boardroom, Autopilot, etc.)
- Seeds key capabilities with API routes
- Ensures registry is always up-to-date

**Seeded Modules:**
- mythic_intelligence
- mythic_coach
- boardroom_brain
- autopilot
- life_simulation
- third_brain
- emotion_os
- identity_engine
- weekly_planner
- relationships_engine
- finance_overview
- voice_layer
- conscious_workspace
- somatic_loop
- narrative_intelligence

### Health Engine

`runModuleHealthCheck()`:
- Checks module health based on recent metrics
- Determines status: ok, degraded, error
- Records health snapshot

`recordModuleInvocation()`:
- Tracks module usage
- Updates daily metrics
- Records latency and success/failure

### Diagnostics Engine

`runDiagnostics()`:
1. **Health Checks** - Critical/warning for error/degraded modules
2. **Usage Checks** - Underused coach/simulation modules
3. **Data Staleness** - Life chapters, deal archetypes, etc.
4. **Config Issues** - Missing configurations (future)

**Diagnostic Rules:**
- Critical: Any core module with status='error'
- Warning: status='degraded' or high latency
- Info: Underused modules, stale data
- Usage: Boardroom decisions without reviews

### System Narrator

`summarizeDiagnosticsForUser()`:
- Uses LLM to generate human-readable summary
- Combines findings, health, and usage data
- Returns friendly, actionable narrative

---

## API Endpoints

### POST /api/masterbrain/diagnostics/run
Runs diagnostics on demand.

**Body:**
```json
{
  "runType": "manual"
}
```

**Response:**
```json
{
  "runId": "uuid",
  "summary": "...",
  "findings": [...]
}
```

### GET /api/masterbrain/diagnostics/latest
Returns most recent diagnostics run + findings.

**Response:**
```json
{
  "run": {...},
  "findings": [...]
}
```

### GET /api/masterbrain/modules
Returns all modules with latest health and metrics.

**Response:**
```json
{
  "modules": [
    {
      "id": "...",
      "key": "mythic_intelligence",
      "name": "Mythic Intelligence Layer",
      "category": "narrative",
      "health": {
        "status": "ok",
        "last_check_at": "..."
      },
      "metrics": {
        "invocations_7d": 42,
        "last_invocation": "..."
      }
    }
  ]
}
```

### GET /api/masterbrain/summary
Returns system narrator summary.

**Response:**
```json
{
  "summary": "Your Mythic Intelligence layer is healthy and active. Boardroom Brain hasn't been used for the last 10 days..."
}
```

---

## Integration Points

### Invocation Tracking
Modules should call `recordModuleInvocation()` when used:
- Mythic Story Sessions
- Mythic Coach
- Boardroom reviews
- Autopilot runs
- Life Simulation runs
- Weekly Planner API

### Weekly Briefing
- Can call `/api/masterbrain/summary`
- Include "System Health" section

### Autopilot
- Reads findings
- Can suggest tasks or trigger refreshes

### CI/CD / Deployment
- Post-deploy hook can call diagnostics
- Quick regression detection

---

## Next Steps

### Frontend UI

#### `/app/master-brain/page.tsx` - Master Brain Console
- **Header**: Title, overall status pill, "Run Full Diagnostics" button
- **Section 1**: System Overview grid (modules by category)
- **Section 2**: Findings (tabs: All / Critical / Warnings / Info)
- **Section 3**: System Narrative (large card with narrator summary)

### Enhanced Features
- Actual API health checks (ping endpoints)
- More sophisticated diagnostic rules
- Self-improvement loops (Pulse proposing refactors)
- Module dependency graph
- Performance benchmarking

---

## Impact

Pulse now has a **Master Brain** that:

1. **Knows Itself** - Registry of all engines and capabilities
2. **Monitors Health** - Tracks status, errors, latency
3. **Runs Diagnostics** - Detects issues automatically
4. **Provides Meta-Coaching** - "Your Deal Lens hasn't run in 10 days"

This is the moment Pulse becomes **self-aware** - it knows what it is, how it's doing, and can tell you about it.

🧠🔍✨
