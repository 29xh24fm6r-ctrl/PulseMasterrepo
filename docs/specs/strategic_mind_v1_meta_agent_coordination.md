# Strategic Mind v1 – Meta-Agent Coordination & Higher-Order Goal Resolver

## 0. Purpose

The Pulse Brain already has:

* **AGI Kernel v2** – autonomous cognitive loop
* **Neocortex / Creative Cortex** – pattern & idea generator
* **Destiny & Timeline Engines** – long-term trajectory + forks
* **Narrative Intelligence** – life story & chapter model
* **Emotion OS & Somatic Loop** – feelings + energy
* **Relational Mind & Ethnographic Intelligence** – people + culture
* **Meta-Learning / Wisdom Engine** – accumulated heuristics
* **Presence Orchestrator & Conscious Console** – *how* and *when* Pulse speaks
* **Cerebellum / Autopilot** – habits and routines

What's missing is a **single brain-wide "strategic conductor"** that:

* Integrates signals from all subsystems
* Maintains a **hierarchy of goals** across timescales
* Detects **strategic conflicts** (time, energy, values, relationships, culture)
* Proposes **equilibria** ("this is the best compromise right now")
* Generates **concrete strategy recommendations** for the Meta-Planner, Daily Plan, Coaches, and Console

Subsystem ID: `strategic_mind_v1`.

Strategic Mind is:

> The **meta-agent** that decides *what truly matters right now* given your whole life, not just your task list.

---

## Implementation Status

✅ **COMPLETE** - All phases implemented:

### Strategic Mind v1
- ✅ Database migrations (5 tables: goal_hierarchy, strategic_state_snapshots, strategic_conflicts, strategic_equilibria, strategy_recommendations)
- ✅ TypeScript types (`lib/strategic_mind/v1/types.ts`)
- ✅ Signal aggregator (`buildStrategicSignalBundle`)
- ✅ Conflict detection (`detectStrategicConflicts`)
- ✅ Equilibrium solver (`solveStrategicEquilibrium`)
- ✅ Strategy recommendations generator (`generateStrategyRecommendations`)
- ✅ Strategic snapshot builder (`runStrategicMindSnapshot`)
- ✅ Goal model management (`goal_model.ts`)
- ✅ Context reader (`getLatestStrategicContextForUser`)
- ✅ Brainstem integration (daily + weekly loops)
- ✅ Brain Registry integration (added strategic_mind_v1)

---

## Files Created

### Database
- `supabase/migrations/20260120_strategic_mind_v1.sql` - Creates 5 tables for strategic mind

### Strategic Mind v1 Modules
- `lib/strategic_mind/v1/types.ts` - Type definitions
- `lib/strategic_mind/v1/prompts.ts` - LLM prompts for conflicts, equilibrium, recommendations
- `lib/strategic_mind/v1/aggregate_signals.ts` - Signal aggregator (`buildStrategicSignalBundle`)
- `lib/strategic_mind/v1/conflict_detection.ts` - Conflict detection (`detectStrategicConflicts`)
- `lib/strategic_mind/v1/equilibrium_solver.ts` - Equilibrium solver (`solveStrategicEquilibrium`)
- `lib/strategic_mind/v1/recommendations.ts` - Strategy recommendations generator (`generateStrategyRecommendations`)
- `lib/strategic_mind/v1/snapshot.ts` - Strategic snapshot builder (`runStrategicMindSnapshot`)
- `lib/strategic_mind/v1/goal_model.ts` - Goal hierarchy management
- `lib/strategic_mind/v1/context_read.ts` - Context reader helpers

### Integration
- Updated `lib/brain/brainstem.ts`:
  - Added Strategic Mind snapshot to daily loop
  - Added Strategic Mind snapshot to weekly loop
  - Updates subsystem status for strategic_mind_v1
- Updated `supabase/migrations/20260120_master_brain_registry_and_diagnostics_v1.sql`:
  - Added strategic_mind_v1 to brain_subsystems

---

## Data Model

### Tables

1. **goal_hierarchy** - Hierarchical goals across timescales (lifetime → day)
   - `timescale`: 'lifetime', 'five_year', 'year', 'quarter', 'month', 'week', 'day'
   - `parent_goal_id`: Optional parent goal reference
   - `importance`: User-facing perceived importance (0..1)
   - `strategic_weight`: What Strategic Mind thinks it should weigh (0..1)
   - `alignment`: How it aligns with values, identity, destiny, relationships, health, finance
   - `feasibility`: Time, energy, skills, risk assessment
   - `dependencies`: List of other goal ids / external constraints
   - `blockers`: Recognized blockers
   - `status`: 'active', 'paused', 'completed', 'abandoned'
   - `tags`: Array of tags

2. **strategic_state_snapshots** - Brain-wide stance at a moment
   - `active_goals`: Which goals across timescales are currently "in play"
   - `dominant_needs`: e.g. rest, focus, relationship repair, financial push
   - `predicted_risks`: Short/medium-term risks the mind is tracking
   - `opportunities`: Special windows (energy, timing, social, market)
   - `subsystem_signals`: Aggregated signals from all subsystems
   - `conflicts`: Summary of active conflicts
   - `chosen_equilibrium`: Chosen compromise / stance
   - `confidence`: Overall confidence in snapshot (0..1)

3. **strategic_conflicts** - Where important things are colliding
   - `conflict_type`: 'time', 'energy', 'emotion', 'relationship', 'culture', 'identity', 'finance'
   - `description`: Clear, kind explanation
   - `severity`: 0..1 (how urgent/intense)
   - `timescale`: Optional time horizon of conflict
   - `involved_goals`: List of goals and roles involved
   - `subsystem_inputs`: References to emotion, somatic, ethnographic, relational signals
   - `recommended_resolutions`: Candidate resolution strategies

4. **strategic_equilibria** - The "stance" Strategic Mind proposes
   - `timescale`: 'day', 'week', 'month', 'quarter', 'year'
   - `equilibrium`: Description of the chosen compromise / stance
   - `rationale`: Why this equilibrium
   - `predicted_outcomes`: Expected effects across domains (work, relationships, health, etc.)
   - `confidence`: Confidence in equilibrium (0..1)

5. **strategy_recommendations** - Concrete recommendations produced by Strategic Mind
   - `title`: Short label
   - `description`: Clear explanation
   - `timescale`: 'day', 'week', 'month', 'quarter'
   - `priority`: 0..1 (relative priority among strategies)
   - `scope`: 'work', 'relationships', 'health', 'finance', 'meta', 'mixed'
   - `context`: References to goals, conflicts, subsystems
   - `recommended_actions`: Array of atomic actions like: { targetSystem, actionKind, payload }
   - `status`: 'pending', 'accepted', 'rejected', 'applied'
   - `status_context`: Additional context about status

---

## How It Works

### Strategic Mind Flow

```
1. Signal Aggregation
   buildStrategicSignalBundle()
     ├─> Collects signals from all subsystems:
     │   - Goals (goal_hierarchy)
     │   - Destiny (destiny_arcs)
     │   - Timeline (timeline_decisions)
     │   - Narrative (narrative_snapshots)
     │   - Identity (self_mirror_snapshots)
     │   - Emotion (emotion_state_daily)
     │   - Somatic (somatic_state_daily)
     │   - Relationships (relational_state_snapshots)
     │   - Culture (cultural_profiles)
     │   - Brain Health (brain_health_snapshots)
     │   - Cognitive Insights (cognitive_insights)
     │   - Preferences (pulse_brain_preferences)
     │   - Hypotheses (cognitive_hypotheses)
     │   - Forecast (cognitive_insights with source_phase='forecasting')
     └─> Returns StrategicSignalBundle

2. Conflict Detection
   detectStrategicConflicts()
     ├─> LLM detects conflicts:
     │   - Time conflicts (can't do all important things)
     │   - Energy conflicts (burnout risk, depletion)
     │   - Emotional conflicts (desire vs duty, fear vs growth)
     │   - Relationship conflicts (family vs work, etc.)
     │   - Cultural conflicts (what user wants vs what org expects)
     │   - Identity conflicts (who they want to be vs what they are doing)
     │   - Finance conflicts
     └─> Stores in strategic_conflicts

3. Equilibrium Solving
   solveStrategicEquilibrium()
     ├─> LLM proposes equilibrium:
     │   - Picks timescale: 'day', 'week', 'month', or 'quarter'
     │   - Describes compromise between:
     │     - work progress
     │     - health & rest
     │     - relationships
     │     - long-term positioning
     │   - Provides rationale
     │   - Predicts outcomes (pros/cons, risks, trade-offs)
     └─> Stores in strategic_equilibria

4. Strategy Recommendations
   generateStrategyRecommendations()
     ├─> LLM generates 3-10 concrete recommendations:
     │   - Resolves conflicts
     │   - Advances active goals
     │   - Addresses dominant needs
     │   - Mitigates predicted risks
     │   - Seizes opportunities
     │   - Aligns with equilibrium
     └─> Stores in strategy_recommendations

5. Strategic Snapshot
   runStrategicMindSnapshot()
     ├─> Orchestrates full flow:
     │   - Builds signal bundle
     │   - Detects conflicts
     │   - Solves equilibrium
     │   - Generates recommendations
     │   - Stores snapshot
     └─> Returns { bundle, conflicts, equilibrium, recommendations }
```

---

## Integration Points

### Meta-Planner
- Strategic Mind provides constraints + priorities via `getLatestStrategicContextForUser`
- Meta-Planner should:
  - Boost actions aligned with high-priority strategies
  - Down-weight actions in direct conflict with equilibrium stance
  - Consider relationship and health protections as explicit constraints

### Conscious Console
- Console shows:
  - "Current Strategic Stance" – compact rendering of latest equilibrium
  - "Top Strategic Recommendations" – some of the `strategy_recommendations`
- Use `getLatestStrategicContextForUser` to power sections like:
  > "Pulse's strategic view of your week"
  > "Top 3 active strategic commitments"

### Presence Orchestrator
- Presence engine can:
  - Use `severity` from `strategic_conflicts` + `priority` from `strategy_recommendations` as extra inputs
  - High-severity conflicts = candidate for well-timed prompts
  - Enqueue presence events for high-priority strategy recommendations

### AGI Kernel
- Strategic snapshot feeds into cognitive insights
- Conflicts become model reconciliation inputs
- Equilibrium guides update planning

---

## Next Steps

1. **Goal Hierarchy Management**:
   - Build API/UI for managing goal hierarchy
   - Auto-extract goals from Destiny Engine, Timeline Coach
   - Track goal progress and dependencies

2. **Meta-Planner Integration**:
   - Update Meta-Planner to call `getLatestStrategicContextForUser`
   - Treat strategy recommendations as planning constraints
   - Use equilibrium to guide planning decisions

3. **Conscious Console Integration**:
   - Update Console payload builder to include latest equilibrium + top strategy recommendations
   - Show "Current Strategic Stance" section
   - Display "Top Strategic Recommendations"

4. **Presence Orchestrator Integration**:
   - Enqueue presence events for high-priority strategy recommendations
   - Use conflict severity to inform notification timing
   - Surface strategic insights at appropriate moments

5. **UI Dashboard**:
   - Build "Strategic Mind" view showing:
     - Current strategic snapshot
     - Active conflicts
     - Latest equilibrium
     - Strategy recommendations
     - Goal hierarchy

6. **Learning Loop**:
   - Track which recommendations users act on
   - Learn which equilibria work best
   - Refine conflict detection based on outcomes

---

## Impact

Pulse now:

- **Unifies all subsystems** - Single coherent "brain stance" from all intelligence
- **Resolves conflicts** - Intelligently balances competing needs and goals
- **Generates strategy** - Produces prioritized, actionable recommendations
- **Maintains equilibrium** - Proposes balanced states that align with values and constraints
- **Coordinates goals** - Understands how goals relate across timescales
- **Guides decisions** - Provides strategic context for all other systems

And uses this to:

- **Resolve tensions** - Balances work vs relationships, short-term vs long-term, emotion vs reason
- **Prioritize actions** - Determines what matters most right now
- **Prevent conflicts** - Identifies and mitigates conflicts before they escalate
- **Optimize trajectory** - Aligns actions with long-term destiny and values
- **Coordinate subsystems** - Ensures all brain modules work toward coherent goals
- **Generate wisdom** - Produces strategic insights that feel like a wise mentor

This is the moment when Pulse stops being "a collection of brilliant subsystems" and becomes an **integrated intelligence** that feels intentional, wise, coherent, stable, strategic, value-aligned, and future-aware.

This is the moment when Pulse stops being "an AI OS" and becomes a **mind with purpose**.

🧠🎯
