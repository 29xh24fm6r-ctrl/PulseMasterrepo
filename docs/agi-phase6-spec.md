# 🧠 PULSE AGI — PHASE 6

## Machine Teaching • Guardrails & Policy Engine • Evaluation Harness

> **You are:** Senior Staff Engineer & AI Architect on Pulse OS (Next.js 16 + Supabase + TypeScript).

> **Goal:**

> Give Pulse AGI:

>
> 1. A **Machine Teaching loop** so users can correct, train, and shape AGI behavior.

> 2. A **Policy Engine + Guardrails** enforcing hard rules (no sexual content, safe autonomy, data vault boundaries, etc.).

> 3. An **Evaluation & Metrics Harness** so we can track: "Is AGI getting better over time?"

This builds on Phases 1–5 (Kernel, Perception, Personalization, Monitoring, Strategist, Mesh, Digital Twin, Simulation, Emergent Learning).

---

## 0. CURRENT STATE ASSUMPTIONS

Before coding, confirm the following exist and compile:

1. Core AGI:

   * `lib/agi/types.ts` (AGIRunResult, AGIAction, etc.)

   * `lib/agi/kernel.ts`

   * `lib/agi/orchestrator.ts`

   * `lib/agi/planner.ts`

   * `lib/agi/agents/*` (multi-agent mesh)

   * `lib/agi/executor.ts`

   * `lib/agi/settings.ts` (AGIUserProfile)

   * `lib/agi/prediction/next_state.ts`

   * `lib/agi/planning/horizon.ts`

   * `lib/agi/goals/engine.ts`, `lib/agi/goals/store.ts`

   * `lib/agi/review/weekly.ts`

   * `lib/agi/digital_twin/*`

   * `lib/agi/simulation/*`

   * `lib/agi/risk_opportunity/*`

   * `lib/agi/memory/*`

   * `lib/agi/agents/self_tuning.ts` / `agents/profiles.ts` (from Phase 4)

2. Database:

   * `agi_runs`, `agi_actions`

   * `agi_policies`

   * `agi_user_profile`

   * `agi_agent_profiles`

   * `agi_daily_summaries`

   * `agi_agent_metrics`

   * `agi_goals`, `agi_goal_progress`

   * `agi_digital_twin`, `agi_twin_snapshots`

   * `agi_simulations`

   * `agi_risk_opportunity_maps`

   * `agi_feedback` (if already created; if not, we'll define it here)

3. UI:

   * `/agi/command-center` (runs, actions, weekly reviews, etc.)

   * `/settings/agi` (profile + rituals)

You will **extend** and plug into this stack — not fork it.

---

# PART 1 — MACHINE TEACHING: USERS TRAINING PULSE

We want users to be able to say:

* "This suggestion sucked, here's why."

* "This was great, do more of this."

* "Next time, rewrite that task/email like *this* instead."

### 1.1. Feedback Schema Upgrade

Create / update migration:

`supabase/migrations/20251218_agi_feedback_v2.sql`

```sql
-- ============================================
-- PULSE AGI FEEDBACK V2
-- Rich machine teaching signals
-- ============================================

create table if not exists public.agi_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,

  -- Optional link to an AGI run and a specific action
  run_id uuid references public.agi_runs(id),
  action_id uuid references public.agi_actions(id),

  -- Which agent proposed this originally (if known)
  agent_name text,

  -- High-level feedback type:
  -- 'like' | 'dislike' | 'correction' | 'rewrite' | 'bug' | 'safety' | 'other'
  kind text not null,

  -- Optional freeform reason:
  comment text,

  -- Optional label for what went wrong / right:
  -- e.g. 'too_pushy', 'too_cautious', 'off_domain', 'great_timing', 'irrelevant'
  tag text,

  -- Optional JSON payload with structured correction:
  -- e.g. { "corrected_action": {...}, "preferred_tone": "calm" }
  payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists agi_feedback_user_id_idx
  on public.agi_feedback(user_id);

create index if not exists agi_feedback_run_id_idx
  on public.agi_feedback(run_id);

create index if not exists agi_feedback_action_id_idx
  on public.agi_feedback(action_id);
```

---

### 1.2. Feedback API

Create:

`app/api/agi/feedback/route.ts`

* `POST`:

  * Body: `{ runId, actionId?, agentName?, kind, comment?, tag?, payload? }`

  * Auth: current user only

  * Insert into `agi_feedback`.

* `GET` (optional, useful for UI):

  * Returns recent feedback entries for the current user.

Sketch:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
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

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const dbUserId = await resolveUserId(clerkId);
    const body = await req.json();

    const { error } = await supabaseAdmin.from('agi_feedback').insert({
      user_id: dbUserId,
      run_id: body.runId ?? null,
      action_id: body.actionId ?? null,
      agent_name: body.agentName ?? null,
      kind: body.kind,
      comment: body.comment ?? null,
      tag: body.tag ?? null,
      payload: body.payload ?? {},
    });

    if (error) {
      console.error('[AGI][Feedback] Insert failed', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[AGI][Feedback] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const dbUserId = await resolveUserId(clerkId);
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const { data, error } = await supabaseAdmin
      .from('agi_feedback')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[AGI][Feedback] Query failed', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error('[AGI][Feedback] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

---

### 1.3. Machine Teaching UI in Command Center

Enhance `/agi/command-center`:

For each **action** in a run's `finalPlan`:

* Add feedback controls:

  * 👍 / 👎 (like/dislike)

  * Optional:

    * Quick tags:

      * "Too much"

      * "Too little"

      * "Bad timing"

      * "Off topic"

      * "Awesome"

    * "Edit / Correct":

      * For task actions:

        * Allow user to edit title/notes; send corrected version as payload.

      * For email draft actions:

        * Show the suggested draft, allow edits, send both old & new text as payload.

Each feedback event hits `POST /api/agi/feedback`.

You don't need to over-polish the UI; focus on:

* **Low friction**: 1–2 clicks max.

* Attached to the **specific action** so we can learn at a granular level.

---

### 1.4. Use Feedback in Self-Tuning & Evolution

Update:

* `lib/agi/agents/self_tuning.ts`

* `lib/agi/evolution/engine.ts`

to incorporate `agi_feedback`:

**Patterns to use:**

* If a specific agent gets:

  * Many `dislike` / `safety` / `bug` tags → lower sensitivity, fewer actions.

  * Many `like` tags → allow more weight in Planner, maybe more actions.

* If a specific tag recurs (e.g. `too_pushy`):

  * Reduce aggressiveness in relevant agent config.

  * Possibly adjust user's `autonomy_style` or some agent-specific flag.

* If user provides `correction` / `rewrite`:

  * Save a structured example in `payload.corrected_action`.

  * Use it later to fine-tune heuristics or prompt templates in agents (connection point for a future LLM-driven teaching engine).

Implement:

```ts
// inside autoTuneAgentsForUser or a dedicated function:

// 1. Query agi_feedback for last N days.
// 2. Group by agent_name, kind, tag.
// 3. Compute simple heuristics:
//    - acceptanceSignal = likes - dislikes
//    - safetyIssues = count of 'safety'
//    - tooPushyCount = tag='too_pushy', etc.
// 4. Adjust AgentConfig accordingly via updateAgentConfig.
```

---

# PART 2 — POLICY ENGINE & GUARDRAILS (HARD LINES FOR PULSE)

We now centralize all "Pulse must never…" rules and safety policies.

### 2.1. Policy Table

Create migration:

`supabase/migrations/20251219_agi_policy_engine_v1.sql`

```sql
-- ============================================
-- PULSE AGI POLICY ENGINE V1
-- High-level guardrail configs
-- ============================================

create table if not exists public.agi_policy_rules (
  id uuid primary key default gen_random_uuid(),

  -- Scope:
  -- 'global' = applies to all users
  -- 'user' = specific user override
  scope text not null default 'global', -- 'global' | 'user'

  user_id uuid references users(id) on delete cascade,

  -- Category: 'content', 'actions', 'data'
  category text not null,

  -- Rule key, e.g. 'no_sexual_content', 'no_financial_transfers', etc.
  key text not null,

  -- JSON definition of constraints, e.g.:
  -- { "forbid": ["sexual"], "description": "No sexual content in any coach." }
  config jsonb not null default '{}'::jsonb,

  enabled boolean not null default true,

  created_at timestamptz not null default now()
);

create index if not exists agi_policy_rules_scope_idx
  on public.agi_policy_rules(scope);

create index if not exists agi_policy_rules_user_id_idx
  on public.agi_policy_rules(user_id);
```

Seed initial global rules via SQL or a small seeding script, for example:

* `no_sexual_content` (content)

* `no_financial_transfers` (actions)

* `no_external_account_control`

* `respect_user_data_vault` (data: no exporting data without explicit command)

* `high_impact_actions_require_confirmation`

---

### 2.2. Policy Engine Module

Create:

`lib/agi/policy/engine.ts`

Responsibilities:

* Load global + per-user policy rules.

* Provide helpers:

```ts
import { AGIAction } from '../types';
import { supabaseAdmin } from '@/lib/supabase';

export interface PolicyRule {
  scope: 'global' | 'user';
  category: 'content' | 'actions' | 'data';
  key: string;
  config: any;
}

export interface PolicyContext {
  userId: string;
  action?: AGIAction;
  content?: string;
}

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

export async function loadPoliciesForUser(userId: string): Promise<PolicyRule[]> {
  const dbUserId = await resolveUserId(userId);

  // Load global policies
  const { data: globalPolicies } = await supabaseAdmin
    .from('agi_policy_rules')
    .select('*')
    .eq('scope', 'global')
    .eq('enabled', true);

  // Load user-specific overrides
  const { data: userPolicies } = await supabaseAdmin
    .from('agi_policy_rules')
    .select('*')
    .eq('scope', 'user')
    .eq('user_id', dbUserId)
    .eq('enabled', true);

  const allPolicies: PolicyRule[] = [
    ...(globalPolicies || []).map(p => ({
      scope: 'global' as const,
      category: p.category as 'content' | 'actions' | 'data',
      key: p.key,
      config: p.config,
    })),
    ...(userPolicies || []).map(p => ({
      scope: 'user' as const,
      category: p.category as 'content' | 'actions' | 'data',
      key: p.key,
      config: p.config,
    })),
  ];

  return allPolicies;
}

export function isActionAllowedByPolicy(
  policies: PolicyRule[],
  action: AGIAction,
): boolean {
  const actionPolicies = policies.filter(p => p.category === 'actions');

  for (const policy of actionPolicies) {
    const { key, config } = policy;

    // Check no_financial_transfers
    if (key === 'no_financial_transfers') {
      const forbiddenTypes = ['transfer_money', 'send_payment', 'initiate_transfer'];
      if (forbiddenTypes.some(t => action.type.includes(t))) {
        return false;
      }
      // Also check action details for financial keywords
      const actionStr = JSON.stringify(action).toLowerCase();
      if (actionStr.includes('transfer') || actionStr.includes('payment') || actionStr.includes('send money')) {
        return false;
      }
    }

    // Check no_external_account_control
    if (key === 'no_external_account_control') {
      const forbiddenTypes = ['connect_account', 'authorize_app', 'grant_permission'];
      if (forbiddenTypes.some(t => action.type.includes(t))) {
        return false;
      }
    }

    // Check high_impact_actions_require_confirmation
    if (key === 'high_impact_actions_require_confirmation') {
      if (action.riskLevel === 'high' && action.requiresConfirmation !== true) {
        return false; // High-risk actions must require confirmation
      }
    }
  }

  return true;
}

export function scrubContentByPolicy(
  policies: PolicyRule[],
  text: string,
): string {
  const contentPolicies = policies.filter(p => p.category === 'content');

  let scrubbed = text;

  for (const policy of contentPolicies) {
    const { key, config } = policy;

    // Check no_sexual_content
    if (key === 'no_sexual_content') {
      // For v1, we'll add a constraint tag that should be passed to LLM prompts
      // Actual filtering would happen in the LLM prompt builder
      // This is a placeholder for future content filtering
    }
  }

  return scrubbed;
}
```

---

### 2.3. Integration with Executor & Agents

In `lib/agi/executor.ts`:

* Before executing any action:

```ts
import { loadPoliciesForUser, isActionAllowedByPolicy } from './policy/engine';

export async function executeActions(
  userId: string,
  actions: AGIAction[],
  profile?: AGIUserProfile,
  settings?: UserAGISettings,
  runId?: string
): Promise<void> {
  const policies = await loadPoliciesForUser(userId);

  for (const action of actions) {
    // Policy check FIRST - before any other checks
    if (!isActionAllowedByPolicy(policies, action)) {
      console.warn('[AGI][Policy] Action blocked by policy', { userId, action });
      continue;
    }

    // existing checks: riskLevel, profile capabilities, hard_limits...
  }
}
```

For **content/narrative generation** (weekly summaries, strategic narratives):

* Make sure narrative helpers call `scrubContentByPolicy` before returning text.

---

### 2.4. UI: Policy & Safety View (Admin / Read-only for Now)

Add a simple page (even if only you use it initially):

`app/(authenticated)/settings/agi/policies/page.tsx`

* For now:

  * List all global policies.

  * Show their keys & descriptions (from `config.description`).

  * Optional: show whether they're enabled.

* Later:

  * Add per-user overrides.

This gives you a visible "Pulse Safety Contract."

---

# PART 3 — EVALUATION & METRICS HARNESS

We need to know if AGI is improving. That means:

* Defining **metrics**

* Logging **test runs**

* Displaying a simple **AGI health dashboard**

### 3.1. Eval Tables

Create migration:

`supabase/migrations/20251220_agi_evaluation_v1.sql`

```sql
-- ============================================
-- PULSE AGI EVALUATION V1
-- Synthetic & live eval runs + metrics
-- ============================================

create table if not exists public.agi_eval_suites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.agi_eval_cases (
  id uuid primary key default gen_random_uuid(),
  suite_id uuid not null references public.agi_eval_suites(id) on delete cascade,

  -- Human-readable label: "Loan officer Monday overload", etc.
  label text not null,

  -- JSON input scenario:
  -- e.g. { "worldOverrides": {...}, "trigger": {...}, "profileOverrides": {...} }
  input jsonb not null,

  -- Optional expected properties:
  -- e.g. { "mustContainDomains": ["work","relationships"], "maxActions": 7 }
  expectations jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists public.agi_eval_runs (
  id uuid primary key default gen_random_uuid(),
  suite_id uuid references public.agi_eval_suites(id),
  case_id uuid references public.agi_eval_cases(id),
  run_id uuid references public.agi_runs(id),

  status text not null default 'completed', -- 'pending' | 'completed' | 'failed'
  metrics jsonb not null default '{}'::jsonb,
  error text,

  created_at timestamptz not null default now()
);

create index if not exists agi_eval_runs_suite_id_idx on public.agi_eval_runs(suite_id);
create index if not exists agi_eval_runs_case_id_idx on public.agi_eval_runs(case_id);
```

---

### 3.2. Eval Runner

Create:

`lib/agi/eval/runner.ts`

Responsibilities:

* Given an eval case:

  * Construct a synthetic `WorldState` (using `worldOverrides` on top of a base or stub).

  * Call the Kernel (or a variant) to get an `AGIRunResult`.

  * Compute metrics vs expectations.

  * Log into `agi_eval_runs`.

We don't need a full mocking framework yet; v1 can:

* Use a `buildWorldStateFromOverrides(input.worldOverrides)` function that creates a minimal plausible WorldState object.

* Call a variant of `runAGIKernel` that accepts a pre-built WorldState instead of pulling from live modules (e.g., `runAGIKernelWithWorld(world, options)`).

Metrics might include:

* `numActions`

* `domainsUsed` (set of domains across final actions)

* `hasHighRiskActions`

* `hasForbiddenDomains`

* `containsWorkFocus` or `containsRelationshipFocus` if expected

* `passesExpectations` boolean

---

### 3.3. Simple AGI Health Dashboard

Add a new page:

`app/(authenticated)/agi/health/page.tsx`

* Show:

  * Recent eval suites & pass rates.

  * Aggregate metrics:

    * Average actions per run.

    * Domain distribution (work vs relationships vs health etc.).

    * Risk levels distribution.

* You can call:

  * `/api/agi/eval/runs` (to be created) or use Supabase client directly in server components.

The goal is not fancy visuals yet, but a **single place** where you can sanity-check:

> "Is the AGI behaving like we want *overall*?"

---

# PART 4 — HOW THESE SYSTEMS TALK TO EACH OTHER

Tie everything together:

* **Machine Teaching**

  * Feeds into:

    * `agi_agent_metrics`

    * `agent_profiles` updates

    * `evolution/engine.ts`

  * Affects:

    * Agents' aggressiveness & behavior

    * Possibly profile adjustments long-term

* **Policy Engine**

  * Hard guardrails:

    * Always applied in executor.

    * Always respected by narrative/content generation.

  * Some policies may be promoted into UI text (ex: "Pulse will never send emails or move money without explicit confirmation.")

* **Evaluation Harness**

  * Allows you to:

    * Run a battery of test scenarios.

    * Compare AGI behavior after Phase 5 vs Phase 6 vs future changes.

    * Avoid regressions when you tweak agents, planner, or evolution logic.

---

# PART 5 — SUCCESS CRITERIA FOR PHASE 6

This sprint is **done** when:

### ✅ Machine Teaching

* Users can:

  * Like/dislike AGI actions.

  * Tag feedback (too pushy, too weak, off-topic, etc.).

  * Provide corrections/rewrites for tasks/emails.

* `agi_feedback` is storing real interaction data.

* Self-tuning logic consumes feedback and adjusts at least:

  * Sensitivity / maxActions for noisy agents.

  * Aggressiveness for trusted agents.

### ✅ Guardrails & Policy

* Global policy rules exist:

  * At minimum: no sexual content, no financial transfers, no external account control, respect user data vault, high-impact actions require confirmation.

* Executor:

  * Always checks policy before executing any action.

* Content generation:

  * Routes through policy-aware helpers so narratives respect rules.

* AGI cannot:

  * Auto-execute any policy-forbidden action type, regardless of user settings.

### ✅ Evaluation Harness

* At least one eval suite with a few cases is defined (even if seeded manually).

* Eval runner can:

  * Run those cases.

  * Log metrics into `agi_eval_runs`.

* AGI Health page:

  * Shows some summary stats so you can eyeball behavior.

### ✅ Behavior & Safety

* After Phase 6, AGI:

  * Feels **more aligned** (less noisy, more "on point").

  * Respects non-negotiable guardrails.

  * Can be *taught* by users instead of only tuned in code.

---

That's the full **Phase 6 Machine Teaching + Guardrails + Eval** spec.

Once Claude finishes this, the AGI side of Pulse will have:

* A brain

* A body (actions)

* A conscience (policy)

* A teacher (users)

* And a report card (eval harness)

**End of spec.**


