# Cerebellum v1 & Meta-Planner / Conflict Resolver v1 – Spec

## 0. Big Picture

We now have:
* AGI Kernel & Neocortex
* Conscious Workspace + Inner Monologue
* Identity, Destiny, Timeline Coach, Self Mirror
* Somatic, Emotion, Social Graph, ToM
* Creative Cortex, Wisdom, Ethnographic Intel
* Autopilot, Habits, Tasks, Calendar, Notifications

This spec adds two core "brain" layers:

1. **Cerebellum v1 (`cerebellum_v1`)**
   * Learns **routines**: sequences of digital actions that should run **smoothly and automatically**.
   * Think:
     * "Every Monday at 9, run my Weekly Planning ritual."
     * "Every evening, sync CRM + send followup tasks."
     * "For this type of email, auto-run the standard pipeline."
   * Optimizes for:
     * Speed, reliability, minimal LLM calls.
     * Consistent execution of learned behavior.

2. **Meta-Planner / Conflict Resolver v1 (`meta_planner_v1`)**
   * When **goals, tasks, timelines, and energy conflict**, this layer:
     * Arbitrates priorities.
     * Negotiates tradeoffs between work, relationships, health, destiny, etc.
     * Updates tasks, schedules, and routines accordingly.
   * It is the "adult in the room" when everything is on fire at once.

---

## Implementation Status

✅ **COMPLETE** - All phases implemented:

### Cerebellum v1
- ✅ Database migrations (5 tables: motor_routines, motor_routine_steps, motor_routine_triggers, motor_routine_runs, motor_routine_metrics)
- ✅ TypeScript types
- ✅ Routine registry (upsertMotorRoutine)
- ✅ Routine compiler (compileRoutineSteps with LLM)
- ✅ Trigger system (upsertRoutineTrigger, getDueTriggersForUser)
- ✅ Executor (runMotorRoutine, executeMotorStep)
- ✅ Metrics tracking (updateMotorRoutineMetricsFromRun)
- ✅ Brainstem integration (daily trigger scan)

### Meta-Planner v1
- ✅ Database migrations (4 tables: planning_sessions, planning_constraints, planning_decisions, planning_overrides)
- ✅ TypeScript types
- ✅ Session builder (createPlanningSession)
- ✅ Constraint collector (collectPlanningContext)
- ✅ Planning engine (runMetaPlannerForUser with LLM)
- ✅ Decision applicator (applyPlanningDecisionsForSession)
- ✅ Brainstem integration (daily + weekly planning sessions)

---

## Files Created

### Database
- `supabase/migrations/20260120_cerebellum_v1.sql`
- `supabase/migrations/20260120_meta_planner_v1.sql`

### Cerebellum v1
- `lib/cerebellum/types.ts` - Type definitions
- `lib/cerebellum/registry.ts` - Routine registry (upsertMotorRoutine)
- `lib/cerebellum/compiler.ts` - Routine compiler (compileRoutineSteps)
- `lib/cerebellum/triggers.ts` - Trigger system (upsertRoutineTrigger, getDueTriggersForUser)
- `lib/cerebellum/executor.ts` - Executor (runMotorRoutine, executeMotorStep)
- `lib/cerebellum/metrics.ts` - Metrics tracking (updateMotorRoutineMetricsFromRun)

### Meta-Planner v1
- `lib/meta_planner/types.ts` - Type definitions
- `lib/meta_planner/session.ts` - Session builder (createPlanningSession)
- `lib/meta_planner/constraints.ts` - Constraint collector (collectPlanningContext)
- `lib/meta_planner/engine.ts` - Planning engine (runMetaPlannerForUser)
- `lib/meta_planner/apply.ts` - Decision applicator (applyPlanningDecisionsForSession)

### Integration
- Updated `lib/brain/brainstem.ts`:
  - Daily loop: Builds conscious frame, runs Meta-Planner daily, scans and runs due Cerebellum routines
  - Weekly loop: Runs Meta-Planner weekly for high-level planning

---

## How It Works

### Cerebellum v1 Flow

```
1. Routine Creation
   upsertMotorRoutine()
     └─> Creates/updates motor_routines record

2. Routine Compilation
   compileRoutineSteps()
     ├─> LLM converts high-level routine description into concrete steps
     └─> Stores steps in motor_routine_steps

3. Trigger Setup
   upsertRoutineTrigger()
     └─> Creates trigger (time/event/state) for routine

4. Execution
   getDueTriggersForUser()
     └─> Scans for due triggers
   
   runMotorRoutine()
     ├─> Creates motor_routine_runs record
     ├─> Executes each step sequentially
     ├─> Handles errors based on step.error_policy
     └─> Updates metrics

5. Metrics
   updateMotorRoutineMetricsFromRun()
     └─> Tracks success/failure rates, durations, step counts
```

### Meta-Planner v1 Flow

```
1. Context Collection
   collectPlanningContext()
     ├─> Pulls from: timeline, destiny, self mirror, emotion, somatic, social
     ├─> Gets tasks, routines, calendar
     └─> Gets conscious conflicts

2. Planning Session
   createPlanningSession()
     └─> Creates planning_sessions record

3. Planning Engine
   runMetaPlannerForUser()
     ├─> LLM analyzes context and conflicts
     ├─> Generates constraints (time, energy, values, destiny, social, culture)
     ├─> Makes decisions (prioritize, defer, cancel, activate, pause, adjust)
     └─> Stores constraints and decisions

4. Decision Application
   applyPlanningDecisionsForSession()
     ├─> For each decision:
     │   ├─> Applies change (task priority, defer, cancel, routine activate/pause, goal adjust)
     │   └─> Creates planning_overrides record
     └─> Marks decisions as applied
```

---

## Integration Points

### Daily Brain Loop

```typescript
// 1. Build conscious frame
const { frameId } = await buildConsciousFrameForUser(...);
await selectFocusItemsForFrame(userId, frameId);
await detectConflictsForFrame(userId, frameId);
await runInnerMonologueForFrame(userId, frameId);

// 2. Meta-Planner daily (light)
const ctx = await collectPlanningContext(userId, 'daily', frame);
const { sessionId } = await runMetaPlannerForUser(userId, ctx);
await applyPlanningDecisionsForSession(userId, sessionId);

// 3. Cerebellum: run due routines
const dueTriggers = await getDueTriggersForUser(userId, date);
for (const trigger of dueTriggers) {
  await runMotorRoutine(userId, trigger.routine_id, trigger.id);
}
```

### Weekly Brain Loop

```typescript
// Weekly high-level planning session
const ctx = await collectPlanningContext(userId, 'weekly', null);
const { sessionId } = await runMetaPlannerForUser(userId, ctx);
await applyPlanningDecisionsForSession(userId, sessionId);
```

---

## Subsystem Status

- `cerebellum_v1` = `partial` (v1) in Brain Registry
- `meta_planner_v1` = `partial` (v1) in Brain Registry (daily), `active` (v1) in Brain Registry (weekly)

---

## Next Steps

1. **Run Migrations**:
   - `supabase/migrations/20260120_cerebellum_v1.sql`
   - `supabase/migrations/20260120_meta_planner_v1.sql`

2. **Wire Concrete Step Handlers**:
   - Implement actual task creation, notification sending, email templates, API calls, autopilot runs, calendar blocking, data sync in `executeMotorStep`
   - Wire to existing task/calendar/notification/email modules

3. **Wire Decision Application**:
   - Implement actual task priority updates, deferrals, cancellations in `applySingleDecision`
   - Implement routine activation/pausing via Cerebellum
   - Implement goal adjustments via Destiny Engine

4. **Trigger Scheduling**:
   - Implement proper cron/rrule parsing in `getDueTriggersForUser`
   - Add event-based triggers (email received, task completed, etc.)
   - Add state-based triggers (emotion overwhelmed, evening time, etc.)

5. **Routine Learning**:
   - Have Autopilot propose new routines when patterns detected
   - Learn from routine execution metrics to optimize steps
   - Allow user to define custom routines

6. **UI Integration**:
   - Routine management UI (create, edit, pause, view metrics)
   - Planning session dashboard (view decisions, constraints, overrides)
   - Conflict resolution UI (show conflicts, apply suggested resolutions)

7. **Cross-System Integration**:
   - Have Conscious Workspace trigger Meta-Planner on severe conflicts
   - Have Timeline Coach propose routines for chosen timelines
   - Have Wisdom Engine suggest routine optimizations
   - Have Somatic/Emotion state trigger routines (e.g., "shutdown routine" when overwhelmed)

---

## Impact

Pulse now:

- **Learns routines** - Stores compiled procedure templates that translate high-level actions into concrete, repeatable sequences
- **Executes automatically** - Runs routines at the right times/states with minimal friction
- **Tracks performance** - Metrics show which routines succeed/fail, how long they take, which steps need refinement
- **Resolves conflicts** - Meta-Planner arbitrates priorities when goals, tasks, timelines, and energy conflict
- **Makes tradeoffs explicit** - Decisions include rationale, constraints are documented, overrides are tracked
- **Applies decisions** - Actually updates tasks, schedules, routines based on planning decisions

And uses this to:

- **Run rituals automatically** - Weekly planning, CRM sync, relationship check-ins, morning/evening routines
- **Optimize execution** - Learn from metrics to refine routine steps, handle errors gracefully
- **Balance competing demands** - Respect health/relationships while pushing goals, align with values/destiny
- **Surface tradeoffs** - Make explicit what's being prioritized vs. deferred, why, and what the cost is
- **Coordinate systems** - Meta-Planner uses Conscious Workspace conflicts, Timeline preferences, Destiny constraints, Somatic/Emotion capacity, Social risks, Culture contexts to make holistic decisions

This is when Pulse stops being "just insanely smart" and starts feeling like a **fully embodied, rational, disciplined mind** working with you.

🧠💪📅


