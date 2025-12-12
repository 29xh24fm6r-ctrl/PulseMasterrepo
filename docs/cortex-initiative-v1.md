# Pulse Cortex Initiative v1

## Overview

The **Cortex Initiative v1** creates the foundation for Pulse as a fully autonomous Life OS by building four interconnected core systems:

1. **Longitudinal Life Model (LLM)** - Life chapters, patterns, timelines
2. **Cognitive Mesh v2** - Central intelligence + shared domain adapters
3. **Pulse Cortex Context + Executive Function v3** - Unified context with enhanced EF
4. **Autonomy Engine v3** - Global, multi-domain proactive action
5. **Cortex Trace Viewer** - Debug UI to see Pulse's mind

## Architecture

### Directory Structure

```
lib/cortex/
├── context/          # Unified context builder
├── autonomy/          # Autonomy Engine v3
│   └── policies/     # Domain-specific policies
├── executive/        # Executive Function v3
├── longitudinal/     # Life Model (chapters, patterns)
├── mesh/             # Cognitive Mesh v2
│   ├── work/
│   ├── relationships/
│   ├── finance/
│   ├── life/
│   └── strategy/
├── trace/            # Trace system
└── index.ts          # Main exports
```

## Core Systems

### 1. Longitudinal Life Model (LLM)

**Location:** `lib/cortex/longitudinal/`

**Purpose:** Builds life chapters and detects patterns over time

**Key Functions:**
- `buildLifeChapters()` - Groups events into meaningful chapters
- `analyzeLongitudinalPatterns()` - Detects cycles and patterns
- `buildLongitudinalModel()` - Main API

**Pattern Types Detected:**
- Procrastination cycles
- Burnout cycles
- Relationship rhythm
- Productivity arcs
- Financial stress windows
- Habit bursts
- Emotion cycles

**Chapter Boundaries:**
- Emotion shifts
- Project boundaries
- Relationship events
- High-stress periods
- Life transitions
- Time-based (90+ days)

### 2. Cognitive Mesh v2

**Location:** `lib/cortex/mesh/`

**Purpose:** Aggregates domain contexts into unified view

**Structure:**
- Each domain has `context.ts` builder
- `mesh/index.ts` aggregates all domains in parallel
- Used by Cortex Context builder

**Domains:**
- Work: Queue, projects, focus sessions
- Relationships: Key people, health scores, interactions
- Finance: Accounts, obligations, cashflow
- Life: Habits, health signals
- Strategy: Arcs, quarterly focus

### 3. Pulse Cortex Context

**Location:** `lib/cortex/context/`

**Purpose:** Unified snapshot of user's entire life state

**Components:**
- Emotion state (from Emotion OS)
- XP summary (today, streak, domain breakdown)
- Memory snapshot (from Third Brain)
- Longitudinal model (chapters, patterns)
- Domain contexts (from Cognitive Mesh)
- Cognitive profile (peak hours, energy, capacity)

**Usage:**
```typescript
const ctx = await buildPulseCortexContext(userId);
// ctx contains everything Pulse needs to make decisions
```

### 4. Executive Function v3

**Location:** `lib/cortex/executive/`

**Purpose:** Domain-agnostic task breakdown and sequencing

**Key Functions:**
- `generateMicroPlan()` - Creates full micro-plan from objectives
- `breakObjectiveIntoSteps()` - Enhanced with longitudinal awareness
- `sequenceMicroSteps()` - Optimal sequencing with pattern awareness

**Enhancements:**
- Uses longitudinal patterns to inform breakdown
- Adjusts step sizes based on procrastination patterns
- Sequences based on burnout windows
- Groups into time blocks automatically

### 5. Autonomy Engine v3

**Location:** `lib/cortex/autonomy/`

**Purpose:** Policy-based proactive action generation

**Structure:**
- `v3.ts` - Core registry and evaluation
- `policies/` - Domain-specific policy files
- Policies auto-register on import

**Policy Examples:**
- **Work:** Stalled projects, follow-up debt, meeting actions, burnout windows, opportunity windows
- **Relationships:** Neglect spikes, financial stress patterns
- **Finance:** Stress windows, cashflow crunches
- **Life:** Habit bursts, streak recovery
- **Strategy:** Stalled arcs, quarterly alignment

**Action Severity:**
- `info` - Informational suggestions
- `warning` - Important alerts
- `urgent` - Critical actions requiring attention

### 6. Cortex Trace System

**Location:** `lib/cortex/trace/`

**Purpose:** Debug stream of all Cortex decisions

**Features:**
- Logs all major Cortex operations
- In-memory store for real-time UI
- Persistent database storage
- Filterable by source, level, time

**Trace Sources:**
- `cortex` - Context building
- `autonomy` - Policy evaluations
- `executive` - EF planning
- `longitudinal` - Pattern detection
- `third_brain` - Memory operations
- `emotion` - Emotion OS updates
- `mesh` - Domain context building

## APIs

### GET `/api/cortex/context`

Returns full Cortex context with optional actions.

**Query Params:**
- `domain` - Filter to specific domain
- `actions=false` - Exclude actions

### GET `/api/cortex/actions`

Returns autonomy actions.

**Query Params:**
- `domain` - Filter to domain
- `highRisk=true` - Only high-severity

### GET `/api/cortex/trace`

Returns trace entries.

**Query Params:**
- `source` - Filter by source
- `level` - Filter by level
- `limit` - Max entries (default 100)
- `since` - ISO timestamp

### POST `/api/cortex/pulse`

Runs the autonomous pulse loop:
1. Builds Cortex Context
2. Runs Autonomy
3. Writes Trace
4. Returns summary

**Use:** Call this every 5-10 minutes via cron or scheduled task

## UI Components

### Cortex Trace Viewer

**Route:** `/cortex-trace`

**Features:**
- Live feed of Cortex decisions
- Timeline of Autonomy actions
- EF-generated plans
- Longitudinal insights
- Domain summaries
- Filterable by source/level
- Auto-refreshes every 5 seconds

## Integration Flow

```
User Action / Scheduled Pulse
  ↓
POST /api/cortex/pulse
  ↓
buildPulseCortexContext(userId)
  ├─→ Emotion OS
  ├─→ XP Engine
  ├─→ Third Brain
  ├─→ buildLongitudinalModel()
  └─→ buildDomainContexts() (Mesh v2)
      ├─→ Work Domain
      ├─→ Relationships Domain
      ├─→ Finance Domain
      ├─→ Life Domain
      └─→ Strategy Domain
  ↓
runAutonomy(ctx)
  ├─→ Work Policies
  ├─→ Relationship Policies
  ├─→ Finance Policies
  ├─→ Life Policies
  └─→ Strategy Policies
  ↓
logTrace() for each decision
  ↓
Return summary + actions
```

## Safety Guardrails

1. **High-Risk Confirmation**: Relationships/finance high-risk actions always require confirmation
2. **Emotional State Filtering**: Block high-risk actions when severely stressed/overwhelmed
3. **Financial Protection**: Block non-low-risk financial actions when emotionally vulnerable
4. **Energy-Based Filtering**: Skip relationship repairs when energy is too low
5. **Longitudinal Awareness**: Adjust plans based on burnout/procrastination patterns

## Files Created

**Longitudinal Model:**
- `lib/cortex/longitudinal/types.ts`
- `lib/cortex/longitudinal/chapter-builder.ts`
- `lib/cortex/longitudinal/pattern-analyzer.ts`
- `lib/cortex/longitudinal/index.ts`

**Cognitive Mesh v2:**
- `lib/cortex/mesh/index.ts`
- `lib/cortex/mesh/work/context.ts`
- `lib/cortex/mesh/relationships/context.ts`
- `lib/cortex/mesh/finance/context.ts`
- `lib/cortex/mesh/life/context.ts`
- `lib/cortex/mesh/strategy/context.ts`

**Executive Function v3:**
- `lib/cortex/executive/ef.ts`
- `lib/cortex/executive/index.ts`

**Autonomy Engine v3:**
- `lib/cortex/autonomy/v3.ts`
- `lib/cortex/autonomy/index.ts`
- `lib/cortex/autonomy/policies/work-policies.ts`
- `lib/cortex/autonomy/policies/relationship-policies.ts`
- `lib/cortex/autonomy/policies/finance-policies.ts`
- `lib/cortex/autonomy/policies/life-policies.ts`
- `lib/cortex/autonomy/policies/strategy-policies.ts`

**Trace System:**
- `lib/cortex/trace/types.ts`
- `lib/cortex/trace/trace.ts`
- `app/api/cortex/trace/route.ts`
- `app/(authenticated)/cortex-trace/page.tsx`
- `supabase/migrations/cortex_trace_v1.sql`

**Pulse Loop:**
- `app/api/cortex/pulse/route.ts`

**Updated:**
- `lib/cortex/types.ts` - Added longitudinal to context
- `lib/cortex/context.ts` - Integrated all systems
- `lib/cortex/index.ts` - Main exports

## Next Steps

1. **Run Migrations**: Apply `cortex_trace_v1.sql` to Supabase
2. **Set Up Pulse Loop**: Schedule `POST /api/cortex/pulse` every 5-10 minutes
3. **Test Trace Viewer**: Visit `/cortex-trace` to see live decisions
4. **Wire into Dashboards**: Update domain pages to use Cortex context
5. **Action Execution**: Create handlers for executing autonomy actions

## Testing

1. **Build Context:**
   ```bash
   GET /api/cortex/context
   ```

2. **Run Pulse Loop:**
   ```bash
   POST /api/cortex/pulse
   ```

3. **View Trace:**
   ```bash
   GET /api/cortex/trace
   ```

4. **Check Actions:**
   ```bash
   GET /api/cortex/actions?domain=work
   ```

## Impact

With Cortex Initiative v1 complete, Pulse now has:

✅ **A Global Brain** - Cognitive Mesh v2 connects all domains
✅ **A Life Timeline** - Longitudinal Model tracks patterns over time
✅ **A Proactive Butler** - Autonomy Engine v3 generates actions
✅ **A Deep Planner** - Executive Function v3 breaks down and sequences
✅ **A Window Into Its Mind** - Trace Viewer shows all decisions

**Pulse doesn't just help the user. Pulse leads the user.**



