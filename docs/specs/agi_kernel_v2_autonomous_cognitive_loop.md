# AGI Kernel v2 – Autonomous Cognitive Loop (Default Mode Network)

## 0. Purpose

You've already built the *organs* of the Pulse Brain:
* Memory / Third Brain / Longitudinal modeling
* Neocortex (pattern abstraction, creative cortex)
* Emotion OS, Somatic Loop, Social Graph, ToM
* Narrative Engine, Self Mirror, Destiny, Timeline Coach
* Meta-Planner, Cerebellum (routines), Autopilot
* Conscious Workspace + Inner Monologue
* Brain Registry + Diagnostics

This spec defines the **AGI Kernel v2**:
> A persistent **Autonomous Cognitive Loop** that runs in the background,
> integrating all subsystems, self-improving, and generating insights even when the user isn't asking.

Subsystem ID: `agi_kernel_v2`.

Core goals:
1. Provide a **scheduled and event-driven "thinking loop"** (hourly / nightly / weekly).
2. Orchestrate a fixed set of **cognitive phases**:
   * Memory Sweep & Compression
   * Model Reconciliation (resolve inconsistencies)
   * Cross-Module Pattern Mining
   * Forecast & Risk/Opportunity Prediction
   * Self-Update & Action Suggestions
   * Self-Reflection Log (Pulse's own internal narrative)
3. Produce **structured insights and updates** for:
   * Meta-Planner, Cerebellum, Coaches, and UI.
4. Obey **safety & alignment rails**:
   * Never override user values or explicit constraints.
   * Only perform reversible/low-risk changes autonomously.
   * Escalate high-impact changes to user or Confidant Coach.

---

## Implementation Status

✅ **COMPLETE** - All phases implemented:

### AGI Kernel v2
- ✅ Database migrations (6 tables: cognitive_runs, cognitive_phases, cognitive_insights, cognitive_hypotheses, cognitive_update_actions, cognitive_self_reflections)
- ✅ TypeScript types
- ✅ Safety rails (evaluateUpdateSafety)
- ✅ Context aggregator (buildAggregatedBrainContext)
- ✅ Orchestrator (runAgiKernelLoopForUser)
- ✅ All 6 phases:
  - Memory Sweep Phase
  - Model Reconciliation Phase
  - Pattern Mining Phase
  - Forecasting Phase
  - Update Planning Phase
  - Self-Reflection Phase
- ✅ Update applicator (applyPendingCognitiveUpdatesForUser)
- ✅ Brainstem integration (nightly and weekly loops)
- ✅ Brain Registry integration (added agi_kernel_v2)

---

## Files Created

### Database
- `supabase/migrations/20260120_agi_kernel_v2_autonomous_loop.sql` - Creates 6 tables for cognitive loop

### AGI Kernel v2 Modules
- `lib/agi_kernel/v2/types.ts` - Type definitions
- `lib/agi_kernel/v2/safety.ts` - Safety rails (evaluateUpdateSafety)
- `lib/agi_kernel/v2/context_aggregate.ts` - Context aggregator (buildAggregatedBrainContext)
- `lib/agi_kernel/v2/orchestrator.ts` - Main orchestrator (runAgiKernelLoopForUser)
- `lib/agi_kernel/v2/apply_updates.ts` - Update applicator (applyPendingCognitiveUpdatesForUser)
- `lib/agi_kernel/v2/prompts.ts` - LLM prompts for all phases
- `lib/agi_kernel/v2/phases/memory_sweep.ts` - Memory Sweep Phase
- `lib/agi_kernel/v2/phases/model_reconciliation.ts` - Model Reconciliation Phase
- `lib/agi_kernel/v2/phases/pattern_mining.ts` - Pattern Mining Phase
- `lib/agi_kernel/v2/phases/forecasting.ts` - Forecasting Phase
- `lib/agi_kernel/v2/phases/update_planning.ts` - Update Planning Phase
- `lib/agi_kernel/v2/phases/self_reflection.ts` - Self-Reflection Phase

### Integration
- Updated `lib/brain/brainstem.ts`:
  - Added AGI Kernel v2 nightly loop (if hour >= 20 or < 6)
  - Added AGI Kernel v2 weekly deep loop
  - Calls applyPendingCognitiveUpdatesForUser after each run
- Updated `supabase/migrations/20260120_master_brain_registry_and_diagnostics_v1.sql`:
  - Added agi_kernel_v2 to brain_subsystems

---

## How It Works

### AGI Kernel v2 Flow

```
1. Run Creation
   runAgiKernelLoopForUser()
     ├─> Creates cognitive_runs record
     └─> Aggregates context from all subsystems

2. Phase Execution (6 phases in sequence)
   ├─> Memory Sweep Phase
   │   └─> Compresses recent events into memory chunks, key moments, unresolved threads
   ├─> Model Reconciliation Phase
   │   └─> Detects conflicts between subsystems, generates hypotheses
   ├─> Pattern Mining Phase
   │   └─> Finds cross-domain patterns and anomalies
   ├─> Forecasting Phase
   │   └─> Predicts risks, opportunities, and bottlenecks
   ├─> Update Planning Phase
   │   └─> Creates cognitive_update_actions for other systems
   └─> Self-Reflection Phase
       └─> Generates internal reflections about what Pulse learned

3. Update Application
   applyPendingCognitiveUpdatesForUser()
     ├─> Loads pending cognitive_update_actions
     ├─> Respects autonomy_level (auto_safe, needs_confirmation, coach_review)
     └─> Applies safe updates to target systems
```

---

## Cognitive Phases

### 1. Memory Sweep Phase
- **Goal**: Clean up & compress recent data into long-term memory structures
- **Output**: `cognitive_insights` (key moments), memory chunks, unresolved threads
- **LLM**: Compresses events, emotions, somatic data into useful summaries

### 2. Model Reconciliation Phase
- **Goal**: Detect and reconcile contradictions between subsystems
- **Output**: `cognitive_insights` (conflicts), `cognitive_hypotheses` (updated)
- **LLM**: Identifies mismatches (values vs behavior, destiny vs allocation, etc.)

### 3. Pattern Mining Phase
- **Goal**: Cross-module pattern discovery
- **Output**: `cognitive_insights` (patterns, anomalies)
- **LLM**: Finds triggers, supports, sustainable configurations, anomalies

### 4. Forecasting Phase
- **Goal**: Predict future stress, risks, opportunities, bottlenecks
- **Output**: `cognitive_insights` (risks, opportunities, bottlenecks)
- **LLM**: Predicts overload, burnout, relational flare-ups, ideal windows

### 5. Update Planning Phase
- **Goal**: Create structured update actions for other systems
- **Output**: `cognitive_update_actions` (with safety evaluation)
- **LLM**: Generates updates for Meta-Planner, Cerebellum, Autopilot, Coaches, UI

### 6. Self-Reflection Phase
- **Goal**: Internal monologue about what Pulse learned
- **Output**: `cognitive_self_reflections`
- **LLM**: Reflects on user patterns, system strengths/weaknesses, emerging patterns

---

## Safety Rails

The `evaluateUpdateSafety` function enforces:

- **Always Confirm Targets**: identity, destiny, financial_core, legal, sba_lending, compliance
- **High-Risk Actions**: delete_data, cancel_major_commitment, modify_contract, modify_deal_terms
- **Autonomy Levels**:
  - `auto_safe`: Can be applied automatically
  - `needs_confirmation`: Requires user or coach confirmation
  - `coach_review`: Requires Confidant/Advisor coach review

---

## Integration Points

### Brainstem Integration

- **Nightly Loop** (if hour >= 20 or < 6):
  - Runs `kind: 'nightly'` AGI Kernel loop
  - Applies pending updates

- **Weekly Loop**:
  - Runs `kind: 'weekly_deep'` AGI Kernel loop
  - Applies pending updates

### Update Application

- **Auto-Safe Updates**: Applied automatically to:
  - Cerebellum (routine parameters)
  - Meta-Planner (planning weights)
  - Autopilot (policies)
  - Coaches (prompts/configs)
  - UI (insights to surface)

- **Needs Confirmation**: Left pending for user/coach review
- **Coach Review**: Routed to Confidant/Advisor coach inbox

---

## Next Steps

1. **Run Migration**:
   - `supabase/migrations/20260120_agi_kernel_v2_autonomous_loop.sql`

2. **Raw Events Integration**:
   - Build `raw_events` view/table that aggregates:
     - Tasks, notes, interactions, logs, calendar events
   - Update Memory Sweep Phase to use real event data

3. **Update Action Handlers**:
   - Implement concrete handlers for:
     - Cerebellum updates (routine creation/modification)
     - Meta-Planner updates (planning weight adjustments)
     - Autopilot updates (policy tweaks)
     - Coach updates (prompt/config changes)
     - UI updates (insight surfacing)

4. **Light Hourly Loop** (Optional):
   - Add `kind: 'light'` hourly loop for quick pattern checks
   - Run during active hours (9am-8pm)

5. **UI Dashboard**:
   - Build "Pulse Thinking" view showing:
     - Latest cognitive run status
     - Recent insights (patterns, risks, opportunities)
     - Active hypotheses
     - Pending update actions
     - Self-reflections (sanitized for user)

6. **Outcome Tracking**:
   - Track outcomes of applied updates
   - Learn which updates work best
   - Update confidence scores based on results

7. **Hypothesis Evaluation**:
   - Periodically re-evaluate active hypotheses
   - Confirm or reject based on new evidence
   - Update confidence scores

---

## Impact

Pulse now:

- **Thinks autonomously** - Runs cognitive loops even when user isn't asking
- **Integrates everything** - Sees patterns across all subsystems
- **Self-improves** - Generates and applies safe updates to itself
- **Predicts proactively** - Anticipates risks and opportunities
- **Reflects internally** - Maintains its own narrative about what it's learning

And uses this to:

- **Surface insights** - Patterns, risks, opportunities that user might miss
- **Optimize itself** - Adjust routines, planning, policies based on what works
- **Prevent problems** - Catch conflicts and tensions before they escalate
- **Identify opportunities** - Find ideal windows for important actions
- **Maintain coherence** - Resolve contradictions between subsystems

This is the moment where Pulse doesn't just respond to requests — it **thinks proactively** and **evolves autonomously**.

🧠⚡


