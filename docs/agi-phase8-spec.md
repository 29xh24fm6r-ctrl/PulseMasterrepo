# 🧠 PULSE AGI — PHASE 8

## Multi-User Orgs • Shared Workspaces • Team AGI Runs

> **You are:** Senior Staff Engineer & AI Architect on Pulse OS (Next.js 16 + Supabase + TypeScript).

> **Goal:**

> Extend Pulse from single-user AGI to **team-aware AGI** with:

>
> * Organizations & shared workspaces

> * Shared entities (deals, tasks, relationships)

> * **Org-level AGI runs** (team standups, pipeline reviews, risk scans)

> * Role-based access & safety

> * Clear UX separating "My Pulse" vs "Team Pulse"

We're not trying to rebuild full multi-tenant SaaS; we're adding a **clean, minimal org layer** on top of your existing AGI stack.

---

## 0. CURRENT STATE ASSUMPTIONS

Before coding, confirm:

1. Single-user AGI stack is live:

   * `lib/agi/types.ts` (WorldState, AGIAction, AGIRunResult, etc.)

   * `lib/agi/worldstate.ts`

   * `lib/agi/agents/*` (Butler, Work, Relationship, Finance, Exec, Emotion, etc.)

   * `lib/agi/planner.ts`

   * `lib/agi/kernel.ts`

   * `lib/agi/digital_twin/*`

   * `lib/agi/simulation/*`

   * `lib/agi/risk_opportunity/*`

   * `lib/agi/settings.ts`, `modes.ts`, `entitlements.ts`

   * `lib/agi/monitoring/*`

   * `lib/agi/memory/*`, `evolution/*`

   * `lib/agi/policy/engine.ts`

2. Supabase tables exist:

   * `agi_runs`, `agi_actions`

   * `user_agi_settings`, `agi_user_profile`

   * `agi_agent_profiles`, `agi_daily_summaries`, `agi_agent_metrics`

   * `agi_goals`, `agi_goal_progress`

   * `agi_digital_twin`, `agi_twin_snapshots`

   * `agi_simulations`, `agi_risk_opportunity_maps`

   * `agi_entitlements`, `agi_feedback`, `agi_eval_*`

   * Core app tables for tasks/deals/contacts likely keyed by `user_id`.

3. Auth:

   * You have a `getCurrentUserId` helper and a notion of "current user".

You will introduce **orgs** & **team AGI** *without* breaking existing single-user flows.

---

# PART 1 — ORGANIZATIONS & MEMBERSHIP

We need a minimal org model: "Org → Members → Roles".

### 1.1. Supabase: `organizations`, `org_members`

Create migration:

`supabase/migrations/20251223_orgs_v1.sql`

```sql
-- ============================================
-- PULSE ORGANIZATIONS V1
-- Single-tenant per org, multi-user, basic roles
-- ============================================

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique, -- optional
  created_at timestamptz not null default now()
);

create table if not exists public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,

  -- 'owner' | 'admin' | 'member' | 'viewer'
  role text not null default 'member',

  created_at timestamptz not null default now()
);

create unique index if not exists org_members_org_user_unique
  on public.org_members(org_id, user_id);

create index if not exists org_members_user_id_idx
  on public.org_members(user_id);
```

If your app already has an org/team model, adjust to reuse it.

---

### 1.2. User Default Org

You need a helper that returns "the org this user is operating in":

* For v1, assume **one org per user** (or create one if none).

* Later you can support multi-org.

Create:

`lib/orgs/service.ts`

```ts
import { supabaseAdmin } from '@/lib/supabase';

export interface Org {
  id: string;
  name: string;
  slug?: string | null;
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

export async function getOrCreateDefaultOrgForUser(userId: string): Promise<Org> {
  const dbUserId = await resolveUserId(userId);

  // 1. Try to find existing membership
  const { data: member } = await supabaseAdmin
    .from('org_members')
    .select('org_id, organizations!inner(name, slug)')
    .eq('user_id', dbUserId)
    .limit(1)
    .maybeSingle();

  if (member?.org_id) {
    const org = member.organizations as any;
    return {
      id: member.org_id,
      name: org.name,
      slug: org.slug,
    };
  }

  // 2. No org yet -> create org and membership
  const { data: org, error: orgError } = await supabaseAdmin
    .from('organizations')
    .insert({
      name: 'My Pulse Workspace',
    })
    .select('*')
    .single();

  if (orgError || !org) {
    throw new Error('[Orgs] Failed to create default org');
  }

  const { error: memberInsertError } = await supabaseAdmin.from('org_members').insert({
    org_id: org.id,
    user_id: dbUserId,
    role: 'owner',
  });

  if (memberInsertError) {
    console.error('[Orgs] Failed to create org member', memberInsertError);
  }

  return { id: org.id, name: org.name, slug: org.slug };
}

export async function getUserOrgRole(orgId: string, userId: string): Promise<'owner' | 'admin' | 'member' | 'viewer' | null> {
  const dbUserId = await resolveUserId(userId);
  const { data, error } = await supabaseAdmin
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', dbUserId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.role as 'owner' | 'admin' | 'member' | 'viewer';
}

export function requireOrgAdmin(role: string | null): boolean {
  return role === 'owner' || role === 'admin';
}
```

Use this wherever you need an `orgId` for AGI.

---

# PART 2 — ORG-LEVEL AGI TYPES & WORLDSTATE

We add parallel types for **OrgWorldState** and **OrgAGIRunResult**.

### 2.1. New Types

In `lib/agi/types.ts`, add:

```ts
export type OrgId = string;

export interface OrgWorldState {
  orgId: OrgId;

  time: {
    now: string;
    timezone: string;
    upcomingEvents: any[];   // aggregated team events if available
  };

  work: {
    teamDeals: any[];
    pipelineByOwner: any[];  // per-member pipeline summary
    criticalDeadlines: any[];
    stuckItems: any[];
  };

  relationships: {
    keyAccounts: any[];
    atRiskAccounts: any[];
    lastTouchByOwner: any[];
  };

  finances?: {
    orgCashflowSummary?: any;
    upcomingOrgBills?: any[];
  };

  habitsAndHealth?: {
    teamRoutines?: any[];
    overloadSignals?: any[];
  };

  goals?: {
    orgGoals?: any[];
    perMemberGoals?: any[];
  };

  meta: {
    lastRunAt?: string;
    orgAgiLevel?: 'off' | 'assist' | 'autopilot';
  };
}

export interface OrgAGIRunResult {
  runId: string;
  orgId: OrgId;
  startedAt: string;
  finishedAt: string;
  trigger: AGITriggerContext;
  worldSnapshot: OrgWorldState;
  agentResults: AgentResult[];
  finalPlan: AGIAction[];
}
```

We can reuse `AGIAction`, `AgentResult`, `AGITriggerContext`.

---

### 2.2. Org WorldState Builder

Create:

`lib/agi/org/worldstate.ts`

```ts
import { OrgWorldState, OrgId } from '../types';
import { supabaseAdmin } from '@/lib/supabase';

// Import existing domain services that support org or multiple owners
// e.g. getOrgDeals, getOrgCalendarEvents, getOrgGoals, etc.
// You may need to create these wrappers if they don't exist yet.

export async function buildOrgWorldState(orgId: OrgId): Promise<OrgWorldState> {
  const now = new Date().toISOString();
  const timezone = 'America/New_York'; // TODO: derive from org or majority members

  // Get org members
  const { data: members } = await supabaseAdmin
    .from('org_members')
    .select('user_id')
    .eq('org_id', orgId);

  const memberUserIds = members?.map(m => m.user_id) || [];

  // Aggregate team deals (if deals table has org_id or user_id)
  const { data: teamDeals } = await supabaseAdmin
    .from('deals')
    .select('*')
    .in('user_id', memberUserIds)
    .limit(50);

  // Aggregate team tasks
  const { data: teamTasks } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .in('user_id', memberUserIds)
    .in('status', ['pending', 'in_progress']);

  // Get critical deadlines (tasks with due dates in next 7 days)
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const criticalDeadlines = (teamTasks || []).filter((t: any) => {
    if (!t.due_date) return false;
    const dueDate = new Date(t.due_date);
    return dueDate <= sevenDaysFromNow && dueDate >= new Date();
  });

  // Get stuck items (tasks overdue or blocked)
  const stuckItems = (teamTasks || []).filter((t: any) => {
    if (!t.due_date) return false;
    return new Date(t.due_date) < new Date();
  });

  // Aggregate relationships (if contacts/relationships table exists)
  const { data: keyAccounts } = await supabaseAdmin
    .from('contacts')
    .select('*')
    .in('user_id', memberUserIds)
    .limit(50);

  // Get org goals (if agi_goals has org_id or we aggregate by member)
  const { data: orgGoals } = await supabaseAdmin
    .from('agi_goals')
    .select('*')
    .in('user_id', memberUserIds)
    .eq('status', 'active')
    .limit(20);

  // Get org AGI settings
  const { data: orgSettings } = await supabaseAdmin
    .from('org_agi_settings')
    .select('level')
    .eq('org_id', orgId)
    .maybeSingle();

  return {
    orgId,
    time: {
      now,
      timezone,
      upcomingEvents: [], // TODO: aggregate calendar events if available
    },
    work: {
      teamDeals: teamDeals || [],
      pipelineByOwner: [], // TODO: group deals by owner
      criticalDeadlines: criticalDeadlines.map((t: any) => ({
        id: t.id,
        name: t.name,
        dueDate: t.due_date,
        ownerId: t.user_id,
      })),
      stuckItems: stuckItems.map((t: any) => ({
        id: t.id,
        name: t.name,
        dueDate: t.due_date,
        ownerId: t.user_id,
      })),
    },
    relationships: {
      keyAccounts: keyAccounts || [],
      atRiskAccounts: [], // TODO: compute from relationship drift
      lastTouchByOwner: [], // TODO: aggregate last interaction dates
    },
    finances: {
      orgCashflowSummary: null, // TODO: aggregate if finance data exists
      upcomingOrgBills: [], // TODO: aggregate bills
    },
    habitsAndHealth: {
      teamRoutines: [],
      overloadSignals: [],
    },
    goals: {
      orgGoals: orgGoals || [],
      perMemberGoals: [], // TODO: group goals by member
    },
    meta: {
      lastRunAt: undefined,
      orgAgiLevel: (orgSettings?.level as 'off' | 'assist' | 'autopilot') || 'assist',
    },
  };
}
```

**Instruction:** Like with single-user `WorldState`, wire these to real modules:

* Deals / CRM: filter by `org_id` or aggregate by member `user_id`s.

* Tasks: tasks assigned to org members.

* Relationships: key org accounts.

* Finance: org-level data when you have it.

---

# PART 3 — ORG-LEVEL AGI KERNEL & AGENTS

We don't want to duplicate everything, but we do want **team-aware agents**.

### 3.1. Org Kernel

Create:

`lib/agi/org/kernel.ts`

```ts
import { OrgId, AGITriggerContext, OrgAGIRunResult, OrgWorldState, AgentResult, AGIAction } from '../types';
import { buildOrgWorldState } from './worldstate';
import { getOrgAgents } from './registry';
import { planFromAgentResults } from '../planner';
import { logOrgAGIRunToDB, logOrgAGIActionsToDB } from './persistence';

export async function runOrgAGIKernel(
  orgId: OrgId,
  trigger: AGITriggerContext,
): Promise<OrgAGIRunResult> {
  const startedAt = new Date().toISOString();
  const world: OrgWorldState = await buildOrgWorldState(orgId);
  const agents = getOrgAgents();

  const agentResults: AgentResult[] = [];
  for (const agent of agents) {
    try {
      const result = await agent.run({ userId: orgId, world: world as any, trigger }); // reuse AgentContext; treat org like 'user' id
      agentResults.push(result);
    } catch (err) {
      console.error(`[AGI][Org] Agent ${agent.name} failed`, err);
    }
  }

  const finalPlan: AGIAction[] = planFromAgentResults(world as any, agentResults, {
    maxActions: 20,
  });

  const finishedAt = new Date().toISOString();

  const runResult: OrgAGIRunResult = {
    runId: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    orgId,
    startedAt,
    finishedAt,
    trigger,
    worldSnapshot: world,
    agentResults,
    finalPlan,
  };

  await logOrgAGIRunToDB(runResult);
  await logOrgAGIActionsToDB(orgId, runResult.runId, finalPlan);

  return runResult;
}
```

We're reusing existing `Agent` interface; for org-agents we'll just interpret `ctx.userId` as `orgId` and `ctx.world` as `OrgWorldState` (typed as `any` in the callsite).

---

### 3.2. Org Agents

Create:

`lib/agi/org/registry.ts`

```ts
import { Agent } from '../agents';
import { teamPipelineAgent } from './agents/teamPipelineAgent';
import { teamRelationshipAgent } from './agents/teamRelationshipAgent';
import { teamExecutionAgent } from './agents/teamExecutionAgent';
import { teamRiskAgent } from './agents/teamRiskAgent';

export function getOrgAgents(): Agent[] {
  return [
    teamPipelineAgent,
    teamRelationshipAgent,
    teamExecutionAgent,
    teamRiskAgent,
    // add more as needed
  ].sort((a, b) => b.priority - a.priority);
}
```

Under `lib/agi/org/agents/`, create 3–4 simple team agents:

#### Example: `teamPipelineAgent.ts`

```ts
import { Agent, makeAgentResult } from '../../agents';
import { AgentContext, AGIAction } from '../../types';

export const teamPipelineAgent: Agent = {
  name: 'TeamPipelineAgent',
  description: 'Optimizes team pipeline focus: key deals, owners, next steps.',
  domains: ['work', 'pipeline'],
  priority: 90,
  defaultAggressiveness: 'medium',

  async run(ctx: AgentContext) {
    const world: any = ctx.world;
    const actions: AGIAction[] = [];

    const deals = world.work?.teamDeals ?? [];
    const criticalDeadlines = world.work?.criticalDeadlines ?? [];
    const stuckItems = world.work?.stuckItems ?? [];

    // Example heuristic: choose top risk/high value deals with no recent movement
    // and propose owner-specific next steps.

    if (deals.length > 0) {
      const topDeals = deals
        .filter((d: any) => d.amount && d.amount > 0)
        .sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0))
        .slice(0, 5);

      if (topDeals.length > 0) {
        actions.push({
          type: 'log_insight',
          label: 'Team pipeline focus: review top deals and assign next steps',
          details: {
            domain: 'work',
            scope: 'org',
            dealsConsidered: topDeals.map((d: any) => ({ id: d.id, name: d.name, amount: d.amount })),
          },
          requiresConfirmation: false,
          riskLevel: 'low',
        });
      }
    }

    if (criticalDeadlines.length > 0) {
      actions.push({
        type: 'log_insight',
        label: `${criticalDeadlines.length} critical deadline(s) approaching for team`,
        details: {
          domain: 'work',
          scope: 'org',
          deadlineCount: criticalDeadlines.length,
          deadlines: criticalDeadlines.slice(0, 5),
        },
        requiresConfirmation: false,
        riskLevel: 'low',
      });
    }

    if (stuckItems.length > 0) {
      actions.push({
        type: 'log_insight',
        label: `${stuckItems.length} stuck item(s) need team attention`,
        details: {
          domain: 'work',
          scope: 'org',
          stuckCount: stuckItems.length,
          stuckItems: stuckItems.slice(0, 5),
        },
        requiresConfirmation: false,
        riskLevel: 'low',
      });
    }

    const reasoning =
      deals.length > 0
        ? `Found ${deals.length} org deals. Highlighting top ones for team review.`
        : 'No org deals found; no team pipeline actions proposed.';

    return makeAgentResult('TeamPipelineAgent', reasoning, actions, deals.length > 0 ? 0.8 : 0.3);
  },
};
```

Similarly:

* `teamRelationshipAgent` – focuses on **org-level accounts** and shared contacts.

* `teamExecutionAgent` – suggests **shared rituals** (team standup, pipeline review, overdue bucket cleanups) and maybe creates shared tasks.

* `teamRiskAgent` – uses org world & risk maps (Phase 5) to highlight **team-level risks**.

Keep them **few, high-quality suggestions** to start.

---

# PART 4 — ORG-LEVEL PERSISTENCE & SETTINGS

We need separate tables for **org AGI runs/actions/settings** so we don't mix them with individual runs.

### 4.1. Supabase: `org_agi_runs`, `org_agi_actions`, `org_agi_settings`

Create migration:

`supabase/migrations/20251224_org_agi_core_v1.sql`

```sql
-- ============================================
-- PULSE ORG-LEVEL AGI CORE V1
-- ============================================

create table if not exists public.org_agi_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,

  started_at timestamptz not null,
  finished_at timestamptz not null,

  trigger jsonb not null,
  world_snapshot jsonb not null,
  agent_results jsonb not null,
  final_plan jsonb not null
);

create index if not exists org_agi_runs_org_id_idx
  on public.org_agi_runs(org_id);

create index if not exists org_agi_runs_started_at_idx
  on public.org_agi_runs(started_at);

create table if not exists public.org_agi_actions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.org_agi_runs(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,

  action jsonb not null,
  status text not null default 'planned', -- 'planned' | 'executed' | 'skipped' | 'failed'
  executed_at timestamptz,
  error text
);

create index if not exists org_agi_actions_org_id_idx
  on public.org_agi_actions(org_id);

create index if not exists org_agi_actions_status_idx
  on public.org_agi_actions(status);

create table if not exists public.org_agi_settings (
  org_id uuid primary key references public.organizations(id) on delete cascade,

  level text not null default 'assist', -- 'off' | 'assist' | 'autopilot'
  max_actions_per_run int not null default 30,
  max_runs_per_day int not null default 8,

  -- For org rituals like daily standup, weekly pipeline review
  rituals jsonb not null default '{}'::jsonb,

  last_updated_at timestamptz not null default now()
);
```

---

### 4.2. Org Persistence Helpers

Create:

`lib/agi/org/persistence.ts`

```ts
import { OrgAGIRunResult, AGIAction } from '../types';
import { supabaseAdmin } from '@/lib/supabase';

export async function logOrgAGIRunToDB(run: OrgAGIRunResult): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin.from('org_agi_runs').insert({
      org_id: run.orgId,
      started_at: run.startedAt,
      finished_at: run.finishedAt,
      trigger: run.trigger,
      world_snapshot: run.worldSnapshot,
      agent_results: run.agentResults,
      final_plan: run.finalPlan,
    }).select('id').single();

    if (error) {
      console.error('[AGI][Org] Failed to log run', error);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    console.error('[AGI][Org] Error logging run:', err);
    return null;
  }
}

export async function logOrgAGIActionsToDB(
  orgId: string,
  runId: string,
  actions: AGIAction[],
): Promise<void> {
  try {
    const rows = actions.map((action) => ({
      run_id: runId,
      org_id: orgId,
      action,
      status: 'planned',
    }));

    const { error } = await supabaseAdmin.from('org_agi_actions').insert(rows);
    if (error) {
      console.error('[AGI][Org] Failed to log actions', error);
    }
  } catch (err) {
    console.error('[AGI][Org] Error logging actions:', err);
  }
}
```

You may also add `executeOrgActions` later (e.g. create shared tasks, add notes, etc.), but for v1: **log only**.

---

# PART 5 — ORG-LEVEL API ROUTES & TEAM DASHBOARD

We need endpoints + UI for **Team AGI**.

### 5.1. API: Run & List Org AGI

Create:

`app/api/org-agi/run/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getOrCreateDefaultOrgForUser, getUserOrgRole } from '@/lib/orgs/service';
import { runOrgAGIKernel } from '@/lib/agi/org/kernel';

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const org = await getOrCreateDefaultOrgForUser(clerkId);

    // Check if user is a member
    const role = await getUserOrgRole(org.id, clerkId);
    if (!role) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const trigger = body.trigger ?? {
      type: 'manual',
      source: 'api/org-agi/run',
    };

    const run = await runOrgAGIKernel(org.id, trigger);
    return NextResponse.json(run);
  } catch (err: any) {
    console.error('[AGI][Org] Run error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

And:

`app/api/org-agi/runs/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getOrCreateDefaultOrgForUser, getUserOrgRole } from '@/lib/orgs/service';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const org = await getOrCreateDefaultOrgForUser(clerkId);

    // Check if user is a member
    const role = await getUserOrgRole(org.id, clerkId);
    if (!role) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('org_agi_runs')
      .select('*')
      .eq('org_id', org.id)
      .order('started_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[AGI][Org] Failed to fetch runs', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error('[AGI][Org] GET runs error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

---

### 5.2. Team AGI Dashboard

Create page:

`app/(authenticated)/org/agi/command-center/page.tsx`

This is the **Team Pulse** view:

* Section: **Org Overview**

  * Org name

  * Number of members

  * Basic pipeline summary (if easy to fetch)

* Section: **Recent Org AGI Runs**

  * List from `/api/org-agi/runs`

  * Show trigger (e.g. "Team Standup", "Weekly Pipeline Review")

  * Started/finished times

* Section: **Run Details**

  * On selecting a run:

    * Show key `worldSnapshot` slices:

      * TeamDeals summary

      * CriticalDeadlines

      * AtRiskAccounts

    * Show `agentResults` (TeamPipelineAgent, etc.)

    * Show `finalPlan` (org-level actions & insights)

* Button: **Run Team AGI Now**

  * Calls `POST /api/org-agi/run` with trigger `{ type: 'manual', source: 'ui/team-command-center' }`.

Keep it visually distinct from personal `/agi/command-center`:

* Label clearly: "Team AGI / Workspace Intelligence".

---

# PART 6 — ORG RITUALS: TEAM STANDUP & WEEKLY PIPELINE REVIEW

Now we add team-level rituals (similar to user-level ones).

### 6.1. Org Ritual Settings

Use `org_agi_settings.rituals` JSON. Example structure:

```json
{
  "daily_standup": {
    "enabled": true,
    "time": "09:00",
    "timezone": "America/New_York"
  },
  "weekly_pipeline_review": {
    "enabled": true,
    "weekday": 1,
    "time": "14:00"
  }
}
```

Add helpers in `lib/agi/org/settings.ts`:

* `getOrgAGISettings(orgId)`

* `saveOrgAGISettings(orgId, settings)`

---

### 6.2. Org Monitoring Tick

If you already have `/api/agi/monitoring/tick` for user-level, create org variant:

`app/api/org-agi/monitoring/tick/route.ts`

* Auth user

* Get org

* Load `org_agi_settings.rituals`

* Based on server time and last run times, decide whether to trigger:

  * `daily_standup` run

  * `weekly_pipeline_review` run

Call `runOrgAGIKernel(orgId, { type: 'schedule_tick', source: 'org_ritual/<name>' })`.

For now, you can keep state minimal (e.g., rely on `org_agi_runs.started_at` to avoid running same ritual twice a day).

---

### 6.3. Org-Level Notifications (Optional V1)

Not strictly required for backend, but:

* For each org AGI run, you can eventually:

  * Create feed entries (e.g., "AGI created new team insight: …")

  * Or send email/slack notifications.

For now: just persist org AGI runs and show in Team Command Center.

---

# PART 7 — SAFETY & ACCESS CONTROL (TEAM CONTEXT)

We must ensure:

* Only org members can see org AGI runs.

* Only owners/admins can change org AGI settings.

* Team AGI respects **the same safety policies** as user AGI (no sexual, no money moves, etc.).

### 7.1. Access Control

In any `/org-agi/*` endpoint:

* Fetch user's membership and role from `org_members`.

* If not a member → 403.

* If adjusting settings (e.g. `org_agi_settings`) require role `'owner'` or `'admin'`.

You can implement small helpers in `lib/orgs/service.ts`:

```ts
export async function getUserOrgRole(orgId: string, userId: string): Promise<'owner' | 'admin' | 'member' | 'viewer' | null>;

export function requireOrgAdmin(role: string) { /* throw / return error if not owner/admin */ }
```

---

### 7.2. Policy Engine Reuse

Team AGI should use the *same* policy logic:

* When you add `executeOrgActions` later:

  * Use `isActionAllowedByPolicy` with a special context that includes org scope.

* For now, team AGI only logs insights, suggestions, and shared tasks: keep all auto-execution conservative.

---

# PART 8 — UX: MY PULSE vs TEAM PULSE

You now have:

* `/agi/command-center` — "My AGI"

* `/org/agi/command-center` — "Team AGI"

Make that distinction **obvious**:

* In your main nav:

  * "My Pulse"

  * "Team Pulse" (if user is in an org / multi-user plan)

On the personal dashboard:

* Show both:

  * Personal AGI status badge

  * Small link: "View Team AGI".

In Team AGI:

* Make it clear when something is:

  * A **personal recommendation** vs

  * A **team-level insight** (e.g. "AGI suggests the *team* does X, Y, Z.")

---

# PART 9 — SUCCESS CRITERIA FOR PHASE 8

This phase is **done** when:

### ✅ Data & Infra

* `organizations` + `org_members` exist and tie users to orgs.

* `org_agi_runs`, `org_agi_actions`, `org_agi_settings` exist and are populated via runs.

* `buildOrgWorldState` returns a structured snapshot from real org data (even if minimal at first).

### ✅ Org-Level AGI

* `runOrgAGIKernel(orgId, trigger)`:

  * Executes without error.

  * Uses 3–4 team agents (pipeline, relationships, execution, risk).

  * Returns a meaningful `OrgAGIRunResult.finalPlan`.

* `/api/org-agi/run`:

  * For an org member, returns a valid OrgAGIRunResult.

### ✅ Team Dashboard

* `/org/agi/command-center`:

  * Shows recent org AGI runs.

  * Allows "Run Team AGI Now".

  * Shows team-level insights (pipeline, relationships, etc.).

### ✅ Rituals

* `org_agi_settings.rituals`:

  * Configurable (even via dev seed for now).

  * Respected by `/api/org-agi/monitoring/tick`:

    * Daily Standup and/or Weekly Pipeline Review cause org AGI runs at appropriate times.

### ✅ Safety & Roles

* Only org members see org AGI data.

* Only owner/admin can change org AGI settings.

* All actions still pass through policy engine + entitlements logic (no new bypasses).

---

Once Claude ships Phase 8, Pulse stops being just "Matt's brain" and becomes a **team brain / firm brain**—exactly what banks, lending teams, and high-performing crews will want.

**End of spec.**


