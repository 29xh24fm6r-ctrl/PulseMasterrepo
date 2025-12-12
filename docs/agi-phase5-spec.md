# 🧠 PULSE AGI — PHASE 5

## Digital Twin, Life Simulation v2 & Emergent Intelligence

> **You are:** Senior Staff Engineer & AI Architect on Pulse OS (Next.js 16 + Supabase + TypeScript).

> **Goal:**

> Give Pulse AGI an internal **Digital Twin** of the user, a **multi-scenario Life Simulation Engine v2**, and an **Emergent Learning Layer** that:

>
> * Predicts likely future trajectories

> * Compares alternate paths (current path vs AGI-advised vs themed scenarios)

> * Mines risks & opportunities across time

> * Evolves AGI behavior based on outcomes & feedback

This builds on Phases 1–4 (Kernel, Perception, Personalization, Monitoring, Strategist Mode, Multi-Agent Mesh, Memory Consolidation, Self-Tuning).

---

# 🅰️ SPRINT A — DIGITAL TWIN ENGINE (User Life Model v1)

### 0. Assumptions

Before Sprint A, confirm:

* WorldState is rich (calendar, routines, email, finance, relationships, habits, emotion, goals, predictions).

* Memory consolidation is working (`agi_daily_summaries`, `agi_agent_metrics`).

* Phase 3+4 are live and stable.

---

## A.1. Data Model: `agi_digital_twin` & `agi_twin_snapshots`

Create migration:

`supabase/migrations/20251215_agi_digital_twin_v1.sql`

```sql
-- ============================================
-- PULSE AGI DIGITAL TWIN V1
-- Persistent per-user life model + snapshots
-- ============================================

create table if not exists public.agi_digital_twin (
  user_id uuid primary key references users(id) on delete cascade,

  -- High-level state of the user
  -- Example structure:
  -- {
  --   "stress": { "baseline": 0.5, "trend": "rising" },
  --   "energy": { "morning": 0.8, "afternoon": 0.4, "evening": 0.3 },
  --   "work": { "pipeline_velocity": 0.7, "overload_risk": "medium" },
  --   "finance": { "stability": 0.6, "upcoming_crunch": false },
  --   "relationships": { "stability": 0.5, "at_risk_count": 3 },
  --   "habits": { "adherence": 0.6, "fragile_streaks": 2 }
  -- }
  state jsonb not null default '{}'::jsonb,

  -- Meta about last update
  last_updated_at timestamptz not null default now()
);



create table if not exists public.agi_twin_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,

  -- When this snapshot was taken
  snapshot_at timestamptz not null default now(),

  -- Serialized state of the digital twin at that time
  state jsonb not null,

  -- Optional tag: 'after_weekly_review', 'pre_crunch', etc.
  tag text,

  created_at timestamptz not null default now()
);

create index if not exists agi_twin_snapshots_user_id_idx
  on public.agi_twin_snapshots(user_id);

create index if not exists agi_twin_snapshots_snapshot_at_idx
  on public.agi_twin_snapshots(snapshot_at);
```

(Adjust `auth.users` reference if you're using a `profiles` table.)

---

## A.2. Digital Twin Engine

Create:

`lib/agi/digital_twin/engine.ts`

Responsibilities:

* Build/update a **compact life model** from:

  * `WorldState`

  * `agi_daily_summaries`

  * Goals & goal progress

  * Predictions (from `next_state.ts`)

Types:

```ts
// lib/agi/digital_twin/engine.ts

import { WorldState } from '../types';

export interface TwinState {
  stress: {
    baseline: number;       // 0–1
    trend: 'rising' | 'falling' | 'stable';
  };
  energy: {
    morning: number;
    afternoon: number;
    evening: number;
  };
  work: {
    pipelineVelocity: number;    // 0–1
    overloadRisk: 'low' | 'medium' | 'high';
  };
  finance: {
    stability: number;          // 0–1
    upcomingCrunch: boolean;
  };
  relationships: {
    stability: number;          // 0–1
    atRiskCount: number;
  };
  habits: {
    adherence: number;          // 0–1
    fragileStreaks: number;
  };
  // Extend as needed
}

export interface TwinUpdateContext {
  world: WorldState;
  // optional: recent summaries, goal progress, etc.
}

export function buildTwinState(ctx: TwinUpdateContext): TwinState {
  const { world } = ctx;

  // Heuristic derivations:
  // - Use emotion trends + daily summaries to estimate stress baseline/trend.
  // - Use routine data + completion patterns for energy.
  // - Use work.deals + tasks + weekly results for pipelineVelocity/overloadRisk.
  // - Use finance perception for stability/upcomingCrunch.
  // - Use relationships perception for stability/atRiskCount.
  // - Use habitsAndHealth for adherence/fragileStreaks.

  // For v1: start simple, then refine as data stabilizes.
  return {
    stress: {
      baseline: 0.5,
      trend: 'stable',
    },
    energy: {
      morning: 0.7,
      afternoon: 0.5,
      evening: 0.4,
    },
    work: {
      pipelineVelocity: 0.6,
      overloadRisk: 'medium',
    },
    finance: {
      stability: 0.6,
      upcomingCrunch: false,
    },
    relationships: {
      stability: 0.5,
      atRiskCount: world.relationships?.atRiskRelationships?.length ?? 0,
    },
    habits: {
      adherence: 0.6,
      fragileStreaks: 0,
    },
  };
}
```

---

## A.3. Twin Persistence Helpers

Create:

`lib/agi/digital_twin/store.ts`

```ts
import { supabaseAdmin } from '@/lib/supabase';
import { TwinState } from './engine';

/**
 * Resolve Clerk ID to database user ID
 */
async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function loadTwinState(userId: string): Promise<TwinState | null> {
  const dbUserId = await resolveUserId(userId);
  const { data, error } = await supabaseAdmin
    .from('agi_digital_twin')
    .select('state')
    .eq('user_id', dbUserId)
    .maybeSingle();

  if (error) {
    console.error('[AGI][Twin] Failed to load', error);
    return null;
  }
  return (data?.state as TwinState) ?? null;
}

export async function saveTwinState(userId: string, state: TwinState): Promise<void> {
  const dbUserId = await resolveUserId(userId);
  const { error } = await supabaseAdmin
    .from('agi_digital_twin')
    .upsert(
      {
        user_id: dbUserId,
        state,
        last_updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

  if (error) {
    console.error('[AGI][Twin] Failed to save', error);
  }
}

export async function snapshotTwinState(
  userId: string,
  state: TwinState,
  tag?: string,
): Promise<void> {
  const dbUserId = await resolveUserId(userId);
  const { error } = await supabaseAdmin.from('agi_twin_snapshots').insert({
    user_id: dbUserId,
    state,
    tag: tag ?? null,
  });
  if (error) {
    console.error('[AGI][Twin] Failed to snapshot', error);
  }
}
```

---

## A.4. When to Update the Twin

Hook twin updates into:

* **Weekly Ritual**: after each weekly review, update & snapshot.

* Optionally: **Nightly consolidation**: small incremental update.

In weekly ritual flow (in Kernel or a Weekly agent):

```ts
import { buildTwinState } from '@/lib/agi/digital_twin/engine';
import { saveTwinState, snapshotTwinState } from '@/lib/agi/digital_twin/store';

const twinState = buildTwinState({ world });
await saveTwinState(userId, twinState);
await snapshotTwinState(userId, twinState, 'after_weekly_review');
```

---

## A.5. Expose Twin in AGIRunResult (for debugging & UI)

In `AGIRunResult` (types.ts), add:

```ts
twinState?: any; // TwinState, but keep it flexible
```

For weekly runs, attach the updated state.

---

✅ **Sprint A done when:**

* `agi_digital_twin` & `agi_twin_snapshots` tables exist and populate.

* Weekly ritual runs generate and save a `TwinState`.

* Command Center can *optionally* show the current Twin summary (even crude).

---

# 🅱️ SPRINT B — LIFE SIMULATION ENGINE v2 (Multi-Scenario)

Now we give Pulse a **"what if we tweak your life"** simulation engine.

---

## B.1. Data Model: `agi_simulations` & `agi_simulation_scenarios`

Create migration:

`supabase/migrations/20251216_agi_simulation_v2.sql`

```sql
-- ============================================
-- PULSE AGI SIMULATION V2
-- Multi-scenario life simulations
-- ============================================

create table if not exists public.agi_simulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,

  -- Scenario key: 'current_path', 'agi_plan', 'health_first', etc.
  scenario_key text not null,

  -- Optional link to a weekly run or goal set
  related_run_id uuid references public.agi_runs(id),
  related_goal_id uuid references public.agi_goals(id),

  -- Time horizon in days (7, 30, 90)
  horizon_days int not null,

  -- Input assumptions
  input jsonb not null, 
  -- e.g. { "twin_state": {...}, "behavior_modifiers": {...} }

  -- Output results of simulation
  output jsonb,
  -- e.g. {
  --  "stressTrajectory": [...],
  --  "pipelineVelocityTrajectory": [...],
  --  "inboxCountTrajectory": [...],
  --  "relationshipHealthTrajectory": [...],
  --  "summaryScores": { "sustainability": 0.7, "growth": 0.6 }
  -- }

  status text not null default 'completed', -- 'pending' | 'completed' | 'failed'
  error text,

  created_at timestamptz not null default now()
);

create index if not exists agi_simulations_user_id_idx
  on public.agi_simulations(user_id);

create index if not exists agi_simulations_scenario_key_idx
  on public.agi_simulations(scenario_key);
```

---

## B.2. Simulation Engine Core

Create:

`lib/agi/simulation/engine_v2.ts`

Responsibilities:

* Given a `TwinState` + "scenario modifiers" + `horizonDays`, produce a simulated trajectory.

Types:

```ts
import { TwinState } from '../digital_twin/engine';

export interface SimulationInput {
  twinState: TwinState;
  horizonDays: number;
  scenarioKey: string; // 'current_path', 'agi_plan', 'health_first', etc.
  behaviorModifiers: any; // structured knobs to adjust behavior
}

export interface SimulationTrajectoryPoint {
  dayOffset: number;
  stress: number;
  pipelineVelocity: number;
  inboxLoad: number;
  relationshipHealth: number;
  habitAdherence: number;
}

export interface SimulationOutput {
  points: SimulationTrajectoryPoint[];
  summaryScores: {
    sustainability: number; // 0–1
    growth: number;        // 0–1
    risk: number;          // 0–1
  };
}

export function runSimulation(input: SimulationInput): SimulationOutput {
  const points: SimulationTrajectoryPoint[] = [];

  // Start from twin baseline
  const base = input.twinState;

  for (let d = 0; d <= input.horizonDays; d++) {
    // Very simplified v1:
    // - Stress gradually increases with overload risk, decreases with health-first behaviors.
    // - Pipeline velocity reacts to behaviorModifiers + goals.
    // - Inbox load drifts based on email behaviors.
    // - Relationship health drifts based on checkinsDue vs atRisk.
    // - Habit adherence influenced by habit agent assumptions.

    // For v1, use simple linear-ish rules; can become more complex later.

    points.push({
      dayOffset: d,
      stress: base.stress.baseline,           // TODO: adjust per scenario
      pipelineVelocity: base.work.pipelineVelocity,
      inboxLoad: 0.5,
      relationshipHealth: base.relationships.stability,
      habitAdherence: base.habits.adherence,
    });
  }

  const summary: SimulationOutput['summaryScores'] = {
    sustainability: 0.7,
    growth: 0.6,
    risk: 0.4,
  };

  return { points, summaryScores: summary };
}
```

---

## B.3. Scenario Definitions

Create:

`lib/agi/simulation/scenarios.ts`

Define a few canonical scenario configs:

* `current_path`

* `agi_plan`

* `health_first`

* `relationship_first`

* `career_push`

* `balanced`

Each scenario provides:

```ts
export interface ScenarioDefinition {
  key: string;
  label: string;
  description: string;
  defaultHorizonDays: number;
  behaviorModifiers: any;
}

export const SCENARIOS: ScenarioDefinition[] = [
  {
    key: 'current_path',
    label: 'Current Path',
    description: 'Project your life forward if you change nothing.',
    defaultHorizonDays: 30,
    behaviorModifiers: { mode: 'baseline' },
  },
  {
    key: 'agi_plan',
    label: 'AGI Plan',
    description: 'Project life assuming you follow AGI recommendations.',
    defaultHorizonDays: 30,
    behaviorModifiers: { followAGI: true },
  },
  {
    key: 'health_first',
    label: 'Health-First',
    description: 'Emphasize recovery and health behaviors.',
    defaultHorizonDays: 30,
    behaviorModifiers: { prioritizeHealth: true },
  },
  // etc.
];
```

The engine can interpret `behaviorModifiers` in its heuristics (e.g. more recovery = slower stress rise, but maybe slower pipeline growth).

---

## B.4. Simulation Orchestrator

Create:

`lib/agi/simulation/orchestrator.ts`

```ts
import { SimulationInput, runSimulation, SimulationOutput } from './engine_v2';
import { TwinState } from '../digital_twin/engine';
import { SCENARIOS } from './scenarios';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Resolve Clerk ID to database user ID
 */
async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function runScenariosForUser(
  userId: string,
  twin: TwinState,
  horizonDaysOverride?: number,
): Promise<{ [scenarioKey: string]: SimulationOutput }> {
  const dbUserId = await resolveUserId(userId);
  const outputs: Record<string, SimulationOutput> = {};

  for (const scenario of SCENARIOS) {
    const input: SimulationInput = {
      twinState: twin,
      horizonDays: horizonDaysOverride ?? scenario.defaultHorizonDays,
      scenarioKey: scenario.key,
      behaviorModifiers: scenario.behaviorModifiers,
    };

    const output = runSimulation(input);
    outputs[scenario.key] = output;

    // Persist to agi_simulations
    const { error } = await supabaseAdmin.from('agi_simulations').insert({
      user_id: dbUserId,
      scenario_key: scenario.key,
      horizon_days: input.horizonDays,
      input: input,
      output,
      status: 'completed',
    });
    if (error) {
      console.error('[AGI][Sim] Failed to store simulation', scenario.key, error);
    }
  }

  return outputs;
}
```

Hook this into:

* Weekly ritual (optional)

* Dedicated "Simulation" command in the AGI Command Center.

---

## B.5. UI: Simulation View in Command Center

Add a new section or tab in `/agi/command-center`:

* "Life Simulation"

  * Options:

    * Run 30-day simulation now

    * Choose scenario(s)

  * Display:

    * For each scenario:

      * Graph of key trajectories (stress, pipeline velocity, relationship health)

      * Summary scores

    * Comparison: "Current Path vs AGI Plan vs Health-First"

Use whatever charting lib you already use (Recharts, etc.).

---

✅ **Sprint B done when:**

* `agi_simulations` table is populated.

* For a user with a TwinState:

  * You can run multiple scenarios.

  * Results are saved and visible in the UI.

* Weekly ritual (or a button) can trigger "Current vs AGI Plan" simulations.

---

# 🅲 SPRINT C — EMERGENT LAYER: RISK/OPPORTUNITY MAP + SELF-EVOLUTION

Now we let Pulse **reason about the simulations + real outcomes** and evolve behavior.

---

## C.1. Risk & Opportunity Map

Create migration:

`supabase/migrations/20251217_agi_risk_opportunity_v1.sql`

```sql
-- ============================================
-- PULSE AGI RISK & OPPORTUNITY MAP V1
-- ============================================

create table if not exists public.agi_risk_opportunity_maps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,

  generated_at timestamptz not null default now(),

  -- Inputs considered (twin state, simulations, goals, etc.)
  input jsonb not null,

  -- Risks: array of { type, label, description, severity, horizonDays }
  risks jsonb not null default '[]'::jsonb,

  -- Opportunities: array of { type, label, description, expectedGain, horizonDays }
  opportunities jsonb not null default '[]'::jsonb,

  -- Optional text narrative
  narrative text,

  created_at timestamptz not null default now()
);

create index if not exists agi_risk_opportunity_maps_user_id_idx
  on public.agi_risk_opportunity_maps(user_id);

create index if not exists agi_risk_opportunity_maps_generated_at_idx
  on public.agi_risk_opportunity_maps(generated_at);
```

---

## C.2. Risk/Opportunity Engine

Create:

`lib/agi/risk_opportunity/engine.ts`

```ts
import { TwinState } from '../digital_twin/engine';
import { SimulationOutput } from '../simulation/engine_v2';

export interface RiskItem {
  type: string; // 'burnout', 'deal_slippage', 'financial_crunch', etc.
  label: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  horizonDays: number;
}

export interface OpportunityItem {
  type: string; // 'pipeline_growth', 'deep_work_window', etc.
  label: string;
  description: string;
  expectedGain: number; // 0–1
  horizonDays: number;
}

export interface RiskOpportunityMap {
  risks: RiskItem[];
  opportunities: OpportunityItem[];
}

export function buildRiskOpportunityMap(
  twin: TwinState,
  simulations: { [scenarioKey: string]: SimulationOutput },
): RiskOpportunityMap {
  const risks: RiskItem[] = [];
  const opportunities: OpportunityItem[] = [];

  // Heuristics:
  // - If stress trajectory goes high in current_path but not in agi_plan => burnout risk.
  // - If pipelineVelocity drops in current_path but rises in agi_plan => opportunity.
  // - If relationshipHealth dips below threshold => relationship risk.
  // - If certain days show low load across scenarios => deep-work opportunity.

  return { risks, opportunities };
}
```

Add persistence helper:

`lib/agi/risk_opportunity/store.ts` to save to `agi_risk_opportunity_maps`.

---

## C.3. Emergent Learning / Evolution Layer

We already have:

* Memory consolidation (`agi_daily_summaries`)

* Agent metrics (`agi_agent_metrics`)

* Self-tuning agent configs (`agi_agent_profiles`)

* Simulations & risk/opportunity maps

Now build:

`lib/agi/evolution/engine.ts`

Responsibilities:

* Periodically (weekly or monthly) analyze:

  * Twin snapshots

  * Simulation outcomes

  * Risk/opportunity maps

  * Agent metrics & configs

  * Goals & goal progress

And adjust:

* Planner weights (identity vs work vs health)

* Default scenario horizons

* Ritual timing suggestions

* "Aggressiveness" of certain agents globally for this user

You don't have to make this super complex yet — v1 can do things like:

* If multiple risk maps highlight "burnout" repeatedly:

  * Increase weight of health/EmotionAgent in Planner scoring.

  * Decrease allowed max actions per day in Exec/Work agents.

* If "pipeline_growth" opportunities are consistent and user has high acceptance:

  * Slightly increase Work/PipelineAgent aggressiveness.

Implement:

```ts
export async function evolveAGIForUser(userId: string): Promise<void> {
  // 1. Load latest twin, last N risk_opportunity_maps, agent_metrics, goals
  // 2. Compute simple heuristics on where AGI is over/under-focusing
  // 3. Update:
  //    - agi_agent_profiles (for specific agents)
  //    - optionally a new planner config table if needed
}
```

Hook this into:

* Weekly ritual (end of weekly review), OR

* A background consolidation job.

---

## C.4. UI: Life Trajectory / "If You Keep Going" Report

In `/agi/command-center`, add:

* A "Life Trajectory" / "AGI Outlook" panel that shows:

  * Current Twin snapshot.

  * Summary of "current path vs AGI plan" simulation.

  * Top 3 risks & top 3 opportunities from latest risk/opportunity map.

  * A short narrative (you can leverage your existing narrative LLM helpers).

This is the **user-facing version of the emergent layer**.

---

✅ **Sprint C done when:**

* `agi_risk_opportunity_maps` is populated.

* For a user, you can:

  * Build a TwinState.

  * Run a couple scenarios.

  * Build a Risk/Opportunity Map.

  * See it summarized in the Command Center.

* `evolveAGIForUser(userId)` runs and updates configs based on repeating patterns.

* Over several weeks, AGI's emphasis and style visibly evolves **because of** the twin + simulations + feedback.

---

# 📦 HOW TO USE THIS WITH CLAUDE

You've now got:

* **Monolithic spec** (this whole message) — paste into Cursor as "PHASE 5 SPEC".

* **3 Mega Sprints** inside it:

1. **Sprint A: Digital Twin Engine v1**

2. **Sprint B: Life Simulation Engine v2**

3. **Sprint C: Emergent Layer (Risk/Opportunity + Evolution)**

You can either:

* Feed the *whole thing* and tell Claude: *"Implement Sprint A first, then B, then C."*

* Or paste sprints A/B/C separately as you go.

---

**End of spec.**


