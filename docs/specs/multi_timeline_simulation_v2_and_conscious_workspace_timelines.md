# Multi-Timeline Simulation v2 + Conscious Workspace Timeline Layer – Spec

## 0. Goal

Upgrade the existing **Life Simulation Engine v1** ("what-if scenarios") into:

1. **Multi-Timeline Simulation Engine v2** (`simulation_v2`)
   * Run **multiple branching futures** for the next 7/30/90 days
   * Under different **policies / styles of living** (baseline, high-discipline, relationship-first, health-recovery, sales-push, sobriety_boundary, etc.)
   * Evaluate each timeline on goals, value alignment, somatic load, social graph, narrative arc

2. **Conscious Workspace: Multi-Timeline Layer**
   * For **today's workspace**: Pull in "future consequences" of choices around current threads
   * Mark threads with trajectory tags, future risk/opportunity scores, simulation-based insights

This is Pulse literally doing:

> "If we keep going like this — vs if we change in these ways — how does your life actually look?"

---

## Implementation Status

✅ **COMPLETE** - All phases implemented:

- ✅ Database migrations (simulation_runs, simulation_policies, simulation_timelines, simulation_steps, simulation_outcomes, workspace_timeline_links)
- ✅ TypeScript types
- ✅ Policy management (with seeded global policies)
- ✅ Input context builder (from goals, habits, somatic, social, narrative, value profile, wisdom)
- ✅ Simulation engine (LLM-powered multi-timeline generation)
- ✅ Workspace timeline layer (linking threads to timelines)
- ✅ API endpoints (timelines, outcomes, workspace timelines)
- ✅ Brainstem integration (weekly simulation, daily workspace linking)

---

## Files Created

### Database
- `supabase/migrations/20260120_multi_timeline_simulation_v2.sql`
  - Includes seed data for 6 global policies (baseline, high_discipline, relationship_first, health_recovery, sales_push, sobriety_boundary)

### Simulation v2 Engine
- `lib/simulation/v2/types.ts` - Type definitions
- `lib/simulation/v2/policies.ts` - Policy management
- `lib/simulation/v2/builder.ts` - Input context builder (from other subsystems)
- `lib/simulation/v2/engine.ts` - Multi-timeline simulation engine (LLM-powered)
- `lib/simulation/v2/workspace_layer.ts` - Workspace timeline linking (LLM-powered)

### API Routes
- `app/api/simulation/timelines/route.ts` - Get simulation timelines
- `app/api/simulation/outcomes/route.ts` - Get simulation outcomes
- `app/api/workspace/timelines/route.ts` - Get workspace timeline links

### Integration
- Updated `lib/brain/brainstem.ts` - Runs simulation in weekly loop, workspace linking in daily loop

---

## How It Works

### 1. Multi-Timeline Simulation Flow

```
runMultiTimelineSimulationForUser()
  ├─> Build input context (goals, habits, somatic, social, narrative, value profile, wisdom)
  ├─> Load simulation policies (baseline, high_discipline, etc.)
  ├─> Create simulation_run
  └─> LLM generates multiple timelines:
      - For each policy: simulate 5-12 steps over horizon
      - Compute scores: work, health, relationships, finance, self_respect, alignment, burnout_risk
      - Generate narrative snippets for each step
      - Compare timelines and produce outcomes
```

### 2. Workspace Timeline Linking Flow

```
linkWorkspaceThreadsToTimelinesForDate()
  ├─> Get today's workspace state + threads
  ├─> Get latest simulation run + timelines + steps
  └─> LLM links threads to timelines:
      - projectedImpact (horizon, direction, domainScores, description)
      - riskIfIgnored (severity, narrative)
      - opportunityIfAddressed (gainScore, narrative)
```

---

## API Usage

### Get Simulation Timelines
```typescript
GET /api/simulation/timelines
// Returns: { run, timelines: [...] }
```

### Get Simulation Outcomes
```typescript
GET /api/simulation/outcomes
// Returns: { outcome: { comparisonSummary, bestTimelines, worstTimelines, keyTradeoffs } }
```

### Get Workspace Timeline Links
```typescript
GET /api/workspace/timelines?date=2024-01-20
// Returns: { links: [{ threadId, timelineId, projectedImpact, riskIfIgnored, opportunityIfAddressed }] }
```

---

## Integration Points

### Weekly Brain Loop

```typescript
// In runWeeklyBrainLoopForUser()
await runMultiTimelineSimulationForUser(
  userId,
  weekEnd,
  30, // horizon days
  'weekly_brain_loop_multitimeline'
);
```

### Daily Brain Loop

```typescript
// In runDailyBrainLoopForUser()
await linkWorkspaceThreadsToTimelinesForDate(userId, date);
```

---

## Simulation Policies (Seeded)

1. `baseline` - Continue current patterns
2. `high_discipline` - Maximum focus on goals, strict habits
3. `relationship_first` - Prioritize relationships over work
4. `health_recovery` - Focus on rest and health
5. `sales_push` - Aggressive business growth
6. `sobriety_boundary` - Maintain strict sobriety boundaries

---

## Subsystem Status

- `simulation_v2` = `partial` (v2) in Brain Registry
- `workspace_timeline_layer` = `partial` (v1) in Brain Registry

---

## Next Steps

1. **Run Migration**: `supabase/migrations/20260120_multi_timeline_simulation_v2.sql`

2. **UI Integration**:
   - Timeline visualization (show multiple futures)
   - Workspace thread timeline tags (show future impact)
   - Outcome comparison view

3. **Expand Policies**:
   - User-custom policies
   - Domain-specific policies

4. **Refine Simulation**:
   - More granular steps
   - Better integration with behavior predictions
   - Real-time timeline updates

5. **Timeline Coach UI**:
   - Walk through futures
   - Let user pick preferred path
   - Align to chosen long arc

---

## Impact

Pulse now:

- **Looks down multiple futures** - Simulates 7/30/90 day trajectories
- **Evaluates policies** - Compares different ways of living
- **Links threads to futures** - Shows how today's choices affect tomorrow
- **Surfaces risks/opportunities** - "If you ignore this, in 30 days it becomes a crisis"

And uses this to:

- **Guide decisions** - "Here's what 30 days from now looks like if you keep living this way vs if you honor these threads today"
- **Prevent crises** - "Small action on this thread today dramatically improves 90-day trajectory"
- **Optimize tradeoffs** - Understand work vs health vs relationships vs self-respect tradeoffs
- **Choose paths** - Help user pick and align to a preferred long arc

This is where Pulse becomes a **time-traveling strategist**, sitting on top of your Neocortex, Somatic body, Narrative, Wisdom, Ethics, and Conscious Workspace. 🧠⏳🌿

Pulse won't just say "this is important." It'll say:

**"Here's what 30 days from now looks like if you keep living this way vs if you honor these threads today."**


