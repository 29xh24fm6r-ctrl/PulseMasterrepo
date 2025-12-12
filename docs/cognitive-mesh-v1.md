# Pulse Cognitive Mesh v1

## Overview

The **Pulse Cognitive Mesh** is a unified architecture that connects all domains (work, relationships, finance, life, strategy) through a central **Cortex** module. It integrates Second Brain, Third Brain, Executive Function Engine, Autonomy/Autopilot, Emotion OS, and XP Engine into one cohesive system.

## Architecture

### Core Components

#### 1. Pulse Cortex (`lib/cortex/`)

**Central cognitive hub** that:
- Builds unified context from all domains
- Provides domain-agnostic Executive Function
- Manages autonomy policies across domains
- Applies safety guardrails

**Key Modules:**
- `types.ts` - Core type definitions
- `context.ts` - Unified context builder
- `executive.ts` - Domain-agnostic EF functions
- `autonomy.ts` - Policy registry and evaluation
- `xp-summary.ts` - XP aggregation for context

#### 2. Domain Adapters (`lib/domains/`)

Each domain has:
- `context.ts` - Builds domain-specific context
- `autonomy.ts` - Registers domain-specific policies

**Domains:**
- `work/` - Productivity, tasks, projects
- `relationships/` - Contacts, CRM, interactions
- `finance/` - Accounts, obligations, cashflow
- `life/` - Habits, health signals
- `strategy/` - Arcs, quarterly focus

## Data Flow

```
User Request
  ↓
buildPulseCortexContext(userId)
  ↓
Parallel Domain Context Builders:
  - buildWorkDomainContext()
  - buildRelationshipsDomainContext()
  - buildFinanceDomainContext()
  - buildLifeDomainContext()
  - buildStrategyDomainContext()
  ↓
Aggregate with:
  - Emotion OS state
  - XP summary
  - Third Brain cognitive profile
  - Memory snapshot
  ↓
PulseCortexContext
  ↓
evaluateAutonomy(ctx)
  ↓
All registered policies evaluate
  ↓
Actions generated per domain
  ↓
Safety guardrails applied
  ↓
Return unified context + actions
```

## Key Types

### PulseCortexContext

```typescript
interface PulseCortexContext {
  userId: string;
  now: Date;
  emotion: EmotionState | null;
  xpSummary: {
    today: number;
    streakDays: number;
    domainBreakdown?: Record<string, number>;
  };
  cognitiveProfile: CognitiveProfile;
  memorySnapshot: MemorySnapshot;
  domains: PulseDomainContext;
}
```

### PulseObjective

```typescript
interface PulseObjective {
  id: string;
  domain: DomainKey;
  title: string;
  description?: string;
  targetDate?: string;
  importance: number; // 0-100
  urgency: number;    // 0-100
  estimatedMinutes?: number;
  metadata?: Record<string, any>;
}
```

### AutonomyAction

```typescript
interface AutonomyAction {
  id: string;
  domain: AutonomyDomain;
  title: string;
  description?: string;
  riskLevel: "low" | "medium" | "high";
  requiresConfirmation: boolean;
  payload: Record<string, any>;
  metadata?: Record<string, any>;
}
```

## Autonomy Policies

### Relationships Domain

1. **Cold Top Relationship** - Alerts when high-value relationships go cold
2. **High-Risk Relationship Neglect** - Critical relationships being neglected
3. **Birthday / Milestone Nudges** - Celebration suggestions

### Work Domain

1. **Stalled Project Recovery** - Projects without recent activity
2. **Follow-up Debt Spike** - Accumulating follow-ups
3. **After-Meeting Action Extraction** - Extract tasks from meetings

### Finance Domain

1. **Spending Spike Alert** - Unusual spending patterns
2. **Cashflow Crunch Early Warning** - Negative cashflow projections
3. **Underutilized Savings Opportunity** - Savings optimizations

### Life Domain

1. **Habit Streak Recovery** - Recover broken habit streaks
2. **Health Signal Decline** - Declining health metrics

### Strategy Domain

1. **Stalled Arc Recovery** - Strategic arcs that have stalled
2. **Quarterly Focus Alignment** - Daily work alignment with goals

## Safety Guardrails

1. **High-Risk Confirmation**: Relationships/finance high-risk actions always require confirmation
2. **Emotional State Filtering**: Block high-risk actions when severely stressed/overwhelmed
3. **Financial Protection**: Block non-low-risk financial actions when emotionally vulnerable
4. **Energy-Based Filtering**: Skip relationship repairs when energy is too low

## APIs

### GET `/api/cortex/context`

Returns full Cortex context with optional actions.

**Query Params:**
- `domain` - Filter to specific domain
- `actions=false` - Exclude actions from response

**Response:**
```json
{
  "context": { ... },
  "actions": [ ... ]
}
```

### GET `/api/cortex/actions`

Returns autonomy actions only.

**Query Params:**
- `domain` - Filter to specific domain
- `highRisk=true` - Only high-risk actions

**Response:**
```json
{
  "actions": [ ... ]
}
```

## Integration Points

### Existing Engines

- **Emotion OS**: `getCurrentEmotionState()` → `ctx.emotion`
- **XP Engine**: `getXPSummary()` → `ctx.xpSummary`
- **Third Brain**: `buildContextSnapshot()` → `ctx.memorySnapshot`
- **Productivity Engine**: `buildTodayQueue()` → `ctx.domains.work.queue`

### Domain Usage

**Relationships Dashboard:**
```typescript
const ctx = await buildPulseCortexContext(userId);
const relationshipActions = getDomainActions(ctx, "relationships");
// Display actions in UI
```

**Life Dashboard:**
```typescript
const ctx = await buildPulseCortexContext(userId);
// Show actions from all domains
const allActions = evaluateAutonomy(ctx);
```

**Productivity (/work):**
```typescript
// Already uses Cortex through buildTodayQueue
// Can now also show cross-domain actions
const ctx = await buildPulseCortexContext(userId);
const workActions = getDomainActions(ctx, "work");
```

## Files Created

**Core Cortex:**
- `lib/cortex/types.ts`
- `lib/cortex/context.ts`
- `lib/cortex/executive.ts`
- `lib/cortex/autonomy.ts`
- `lib/cortex/xp-summary.ts`
- `lib/cortex/index.ts`

**Domain Context Builders:**
- `lib/domains/work/context.ts`
- `lib/domains/relationships/context.ts`
- `lib/domains/finance/context.ts`
- `lib/domains/life/context.ts`
- `lib/domains/strategy/context.ts`

**Domain Autonomy Policies:**
- `lib/domains/work/autonomy.ts`
- `lib/domains/relationships/autonomy.ts`
- `lib/domains/finance/autonomy.ts`
- `lib/domains/life/autonomy.ts`
- `lib/domains/strategy/autonomy.ts`

**APIs:**
- `app/api/cortex/context/route.ts`
- `app/api/cortex/actions/route.ts`

## Next Steps

1. **Wire into UI**: Update dashboards to call Cortex APIs
2. **Action Execution**: Create handlers for executing autonomy actions
3. **Policy Refinement**: Tune policy priorities and thresholds
4. **Cross-Domain Objectives**: Support objectives spanning multiple domains
5. **Learning Loop**: Track action acceptance/rejection to improve policies

## Testing

Use the Cortex context API to verify:
- All domains build context correctly
- Policies generate appropriate actions
- Safety guardrails filter risky actions
- Cross-domain integration works

Example:
```bash
GET /api/cortex/context?domain=relationships&actions=true
```



