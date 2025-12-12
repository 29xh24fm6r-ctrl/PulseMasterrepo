# 🧠 PULSE AGI — PHASE 4

## Multi-Agent Cognitive Mesh • Memory Consolidation • Self-Tuning Agents

> **You are:** Senior Staff Engineer & AI Architect on Pulse OS (Next.js 16 + Supabase + TypeScript).

> **Goal:**

> Evolve Pulse AGI from a "single brain with helpers" into a **mesh of specialist agents** that:

>
> * Cover all major domains (work, pipeline, email, relationships, finance, habits, health, etc.)

> * Are coordinated by a **negotiation-style planner**

> * Use **memory consolidation** to extract patterns from AGI runs

> * **Self-tune** their behavior per user based on feedback and observed outcomes

You are building **Phase 4** on top of Phases 1–3 (Kernel, Perception, Personalization, Monitoring, Strategist Mode).

---

## 0. CURRENT STATE ASSUMPTIONS

Before coding, confirm:

1. AGI Kernel stack:

   * `lib/agi/types.ts`

   * `lib/agi/worldstate.ts`

   * `lib/agi/agents/*` (Butler, Work, Relationship, Finance, Identity, Emotion, Exec Function, Goals, etc.)

   * `lib/agi/planner.ts` (multi-factor v2)

   * `lib/agi/kernel.ts`

   * `lib/agi/orchestrator.ts`

   * `lib/agi/persistence.ts`

   * `lib/agi/executor.ts`

   * `lib/agi/settings.ts` (AGIUserProfile)

   * `lib/agi/monitoring/daemon.ts` + `monitoring/rituals.ts`

   * `lib/agi/prediction/next_state.ts`

   * `lib/agi/planning/horizon.ts`

   * `lib/agi/goals/engine.ts` + `goals/store.ts`

   * `lib/agi/review/weekly.ts`

   * `lib/agi/narrative/strategic.ts` (if LLM narrative is already in)

2. DB tables:

   * `agi_runs`

   * `agi_actions`

   * `agi_policies`

   * `user_agi_settings`

   * `agi_user_profile`

   * `agi_feedback`

   * `agi_agent_profiles` (from earlier spec)

   * `agi_goals`

   * `agi_goal_progress`

3. UI:

   * `/agi/command-center` (runs, actions, weekly reviews, etc.)

   * `/settings/agi` (profile/config)

You will **extend**, not replace, any of this.

---

# PART 1 — EXPAND TO A RICH MULTI-AGENT MESH

We want **12–20 clearly defined agents**, each with:

* A domain/purpose

* Clear inputs from WorldState

* Well-bounded outputs (a few high-quality actions)

* Metadata to help the planner negotiate between them

### 1.1. Standardize Agent Metadata

In `lib/agi/agents.ts`, extend the `Agent` interface:

```ts
export type AgentDomain =
  | 'work'
  | 'pipeline'
  | 'email'
  | 'relationships'
  | 'finance'
  | 'habits'
  | 'health'
  | 'identity'
  | 'emotion'
  | 'execution'
  | 'planning'
  | 'other';

export interface Agent {
  name: string;
  description: string;

  // Domain(s) this agent operates in
  domains: AgentDomain[];

  // Priority is a coarse ordering; planner adds finer scoring.
  priority: number;

  // How "aggressive" this agent tends to be with suggestions.
  defaultAggressiveness?: 'low' | 'medium' | 'high';

  run(ctx: AgentContext): Promise<AgentResult>;
}
```

Update existing agents to fill in:

* `domains` (e.g. WorkAgent: `['work','pipeline']`, RelationshipAgent: `['relationships']`, etc.)

* `defaultAggressiveness` (e.g. EmotionAgent: `'low'`, ExecFunctionAgent: `'medium'`).

---

### 1.2. Add New Specialist Agents

Under `lib/agi/agents/`, add the following agents (thin v1 implementations):

1. **PipelineAgent**

   * Domain: `['pipeline', 'work']`

   * Uses:

     * `world.work.activeDeals`, `world.work.keyDeadlines`

     * `email.riskThreads`, `email.waitingOnUser`

   * Focus:

     * Top 3 deal-moving actions per day / ritual.

2. **EmailAgent**

   * Domain: `['email','work']`

   * Uses:

     * `email.urgentThreads`, `email.waitingOnUser`, `email.waitingOnOthers`

   * Focus:

     * Clear inbox triage suggestions:

       * reply, delegate, schedule, ignore.

3. **HabitAgent**

   * Domain: `['habits','health','personal_growth']`

   * Uses:

     * `habitsAndHealth.habits`, `streaks`, `riskSignals`

   * Focus:

     * Protect / rebuild key streaks.

     * Suggest tiny habit actions when energy is low.

4. **Sleep/RecoveryAgent** (even if data is minimal now)

   * Domain: `['health']`

   * Uses:

     * Routines, late-night activity patterns, stress trend.

   * Focus:

     * Suggest earlier shutdown, recovery nights, reduce overload.

5. **Household/LifeOpsAgent** (basic v1)

   * Domain: `['other']`

   * Uses:

     * Tasks flagged as personal/household.

   * Focus:

     * Keep household tasks from getting buried under work.

6. **GoalsAgent** (if not already separate)

   * Domain: `['planning','work','relationships','finance','health']`

   * Uses:

     * HorizonPlan, active goals, goal progress, world patterns.

   * Focus:

     * Translate goals to concrete next steps & check-ins.

7. **DeepWorkAgent**

   * Domain: `['work','execution']`

   * Uses:

     * Routine profile (bestFocusWindows), calendar fragmentation, key tasks.

   * Focus:

     * Suggest & protect deep work blocks aligned with identity & goals.

Each new agent should:

* Propose *at most* 3–5 actions per run.

* Use `riskLevel` and `details.domain` fields consistently.

* Use `reasoningSummary` to make its thinking inspectable.

Register them in `lib/agi/registry.ts` in a reasonable order (identity/emotion first, then planning/exec, then domain agents, then butler).

---

# PART 2 — PLANNER V3: NEGOTIATION & DOMAIN BALANCING

We want the planner to act like a **meeting of agents** instead of a simple flat scorer.

### 2.1. Extend Planner Options

In `lib/agi/planner.ts`, update `PlannerOptions`:

```ts
interface PlannerOptions {
  maxActions?: number;
  profile?: AGIUserProfile;
  // Optional domain quotas to prevent single-domain monopolization
  maxActionsPerDomain?: Record<string, number>;
}
```

### 2.2. Per-Domain Action Bucketing

When collecting actions:

* For each `AGIAction`, determine `domain` from:

  * `action.details?.domain` OR

  * Fallback: agent's domain if needed (you may need to pass agent name into scoring loop).

Implement logic like:

1. Compute base score from:

   * Agent confidence.

   * Existing emotional/identity/long-term heuristics.

   * Personalization (profile priorities, autonomy style).

2. Apply **domain balancing**:

   * Keep count of how many actions you've already accepted per domain.

   * If domain count exceeds `maxActionsPerDomain[domain]` (or a default like 3), penalize further actions heavily.

3. Optionally, give a small **cross-domain diversity bonus** if action comes from a domain that currently has 0 actions.

This protects the user from, e.g., PipelineAgent drowning out everything else.

---

### 2.3. Negotiation-Style Logging

Add structured logging inside the planner:

* When actions are scored, log:

  * `agentName`, `domain`, `baseScore`, `finalScore`, whether it was selected.

* In dev mode, this helps debug "why did AGI pick these 7 things."

Keep logging behind an env flag if needed (e.g. `AGI_DEBUG=1`).

---

# PART 3 — MEMORY CONSOLIDATION ENGINE

We want a nightly/periodic process that turns raw AGI runs/actions into:

* Patterns

* Summaries

* Behavior stats per agent

* Inputs to agent self-tuning & long-term insight

### 3.1. DB Tables for Consolidated AGI Memory

Create migration:

`supabase/migrations/20251214_agi_memory_consolidation_v1.sql`

```sql
-- ============================================
-- PULSE AGI MEMORY CONSOLIDATION V1
-- Aggregated patterns & metrics
-- ============================================

-- Aggregated behavior per user per day
create table if not exists public.agi_daily_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,

  date date not null,

  -- Basic counts
  runs_count int not null default 0,
  actions_planned_count int not null default 0,
  actions_executed_count int not null default 0,

  -- Domain breakdown: { "work": 10, "relationships": 3, ... }
  domain_action_counts jsonb not null default '{}'::jsonb,

  -- Emotion trend snapshot: e.g. { "avgStress": 0.7, "spikes": 2 }
  emotion_summary jsonb not null default '{}'::jsonb,

  -- High-level notes or tags (can be auto-generated)
  tags text[] default array[]::text[],

  created_at timestamptz not null default now()
);

create index if not exists agi_daily_summaries_user_id_idx
  on public.agi_daily_summaries(user_id);

create index if not exists agi_daily_summaries_date_idx
  on public.agi_daily_summaries(date);



-- Per-agent metrics over time
create table if not exists public.agi_agent_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  agent_name text not null,

  -- Over a window (e.g. last 7 days)
  window_start date not null,
  window_end date not null,

  runs_count int not null default 0,
  actions_proposed int not null default 0,
  actions_selected int not null default 0,
  actions_executed int not null default 0,

  -- Derived signals: e.g. how often user accepts vs rejects
  acceptance_rate numeric,
  rejection_rate numeric,

  config_snapshot jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists agi_agent_metrics_user_id_idx
  on public.agi_agent_metrics(user_id);

create index if not exists agi_agent_metrics_agent_name_idx
  on public.agi_agent_metrics(agent_name);
```

We will **derive** these from `agi_runs`, `agi_actions`, and `agi_feedback`.

---

### 3.2. Consolidation Job

Create:

* `lib/agi/memory/consolidation.ts`

Responsibilities:

1. For a given `userId` and `date` (default to "yesterday"):

   * Query `agi_runs` and `agi_actions` for that date.

   * Aggregate:

     * `runs_count`

     * `actions_planned_count`

     * `actions_executed_count`

     * `domain_action_counts` (from `action.action.details.domain`)

     * `emotion_summary` (e.g. average predicted stress if available)

   * Upsert into `agi_daily_summaries`.

2. For a given `userId` and time window (e.g., last 7 days):

   * Aggregate, per agent:

     * `runs_count`

     * `actions_proposed` (proposed in `agent_results`)

     * `actions_selected` (in `finalPlan`)

     * `actions_executed` (in `agi_actions` with status `executed`)

     * Combine with `agi_feedback` for acceptance/rejection if available.

   * Upsert into `agi_agent_metrics`.

3. Provide a public function:

```ts
export async function runAGIMemoryConsolidationForUser(
  userId: string,
  date?: Date,
): Promise<void>;
```

---

### 3.3. Scheduling Consolidation

You can hook this into:

* A nightly job (if you have cron infra) OR

* A manual dev endpoint:

`app/api/agi/memory/consolidate/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { runAGIMemoryConsolidationForUser } from '@/lib/agi/memory/consolidation';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  await runAGIMemoryConsolidationForUser(userId);
  return NextResponse.json({ ok: true });
}
```

Later, migrate to real scheduled jobs.

---

# PART 4 — SELF-TUNING AGENTS (USING PROFILES + METRICS + FEEDBACK)

We already have `agi_agent_profiles` from earlier spec. Now we need to:

* Actually *use* it

* Let agents gently adjust their behavior per user

### 4.1. Agent Profile Schema (Reminder)

`agi_agent_profiles` (existing) holds:

* `user_id`

* `agent_name`

* `config` (jsonb)

* `last_updated_at`

We will give this some structure.

Example config keys per agent:

* `sensitivity` (how easily it triggers suggestions)

* `maxActionsPerRun`

* `domainWeights`

* `cooldownMinutesBetweenSuggestions`

Agents read these and adjust output.

---

### 4.2. Agent Profile Service

Create:

`lib/agi/agents/profiles.ts`

Functions:

```ts
export interface AgentConfig {
  sensitivity?: 'low' | 'medium' | 'high';
  maxActionsPerRun?: number;
  cooldownMinutes?: number;
  domainWeights?: Record<string, number>;
  // add others as needed
}

export async function loadAgentConfig(
  userId: string,
  agentName: string,
): Promise<AgentConfig>;

export async function updateAgentConfig(
  userId: string,
  agentName: string,
  partial: Partial<AgentConfig>,
): Promise<void>;
```

Implementation:

* `loadAgentConfig`:

  * Query `agi_agent_profiles` for `(user_id, agent_name)`.

  * Merge with sensible defaults per agent.

* `updateAgentConfig`:

  * Upsert into `agi_agent_profiles` with merged config.

Agents then:

* Call `loadAgentConfig` at start of `run()` (or have Kernel pass preloaded configs in `AgentContext` if needed for efficiency).

---

### 4.3. Auto-Adjustment Logic

Create:

`lib/agi/agents/self_tuning.ts`

Responsibilities:

* For each `userId` + `agentName`:

  * Look at `agi_agent_metrics` for the last N days (e.g. 7 or 30).

  * Look at `agi_feedback` (accept/reject/modified).

  * Decide small config adjustments, e.g.:

    * If `actions_proposed` is high but `actions_selected` & `acceptance_rate` are low → reduce `sensitivity`, lower `maxActionsPerRun`.

    * If `actions_proposed` is low but `acceptance_rate` is very high → maybe increase `sensitivity` slightly.

    * If feedback often says "too much" → dial down; "not enough help" → dial up.

Public function:

```ts
export async function autoTuneAgentsForUser(userId: string): Promise<void>;
```

This should:

* Loop through agents seen in `agi_agent_metrics`.

* For each, compute new config.

* Call `updateAgentConfig`.

Hook this into:

* Memory consolidation job, or

* A separate periodic job: `runAGIAgentAutoTuningForUser(userId)`.

---

# PART 5 — UI: AGI "Brain Analytics" (Optional but Powerful)

We can expose some of this in the UI (even if v1 is minimal):

### 5.1. Command Center: Agent & Domain Breakdown

In `/agi/command-center`, add:

* A simple "AGI Analytics" section for the current user:

  * Last 7 days:

    * Runs per day

    * Actions by domain

    * Top 3 most active agents

* Later: show acceptance vs rejection summary.

This helps:

* Debug behavior

* Build user trust ("Here's how I've been spending my AGI cycles for you.")

---

# PART 6 — SUCCESS CRITERIA FOR PHASE 4

This sprint is **done** when:

### ✅ Multi-Agent Mesh

* There are at least ~12 distinct agents (existing + new specialists).

* Each agent has:

  * `domains`

  * `defaultAggressiveness` set

  * Clear, narrow responsibilities.

* Planner v3:

  * Implements per-domain action balancing.

  * Produces diverse, not single-domain-dominated plans.

### ✅ Memory Consolidation

* `agi_daily_summaries` and `agi_agent_metrics` are populated for real users.

* `runAGIMemoryConsolidationForUser` runs without errors and compacts AGI activity into usable summaries.

### ✅ Self-Tuning Agents

* `loadAgentConfig` / `updateAgentConfig` are implemented and used.

* `autoTuneAgentsForUser` updates `agi_agent_profiles.config` based on metrics + feedback.

* Over time, agents adjust to:

  * Propose fewer, higher-quality actions if noisy.

  * Propose more help if consistently helpful and under-active.

### ✅ Behavior

* For two users with different profiles & feedback patterns, agent behavior diverges:

  * One user gets strongly pipeline-focused AGI.

  * Another gets more relationship/health/habit-focused AGI.

### ✅ Safety

* No new action types bypass Safe Autonomy v1 rules:

  * Still **only low-risk internal actions** auto-executed.

  * Capabilities + hard_limits + AGI level all enforced.

---

You are **not yet** doing:

* Full "digital twin" sandboxing.

* Multi-month simulation comparisons.

* Deep emergent behavior modeling.

That's Phase 5.

This Phase 4 sprint makes Pulse feel less like "one AI" and more like a **council of specialists** that learns how to support each user uniquely over time.

**End of spec.**


