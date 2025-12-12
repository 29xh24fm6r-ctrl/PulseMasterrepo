# 🧠 PULSE OS — PHASE 12 MEGA SPEC

## Cross-Vertical Intelligence Packs + Household / Family AGI Mode

> **You are:** Senior Staff Engineer on Pulse OS (Next.js 16 + Supabase + TypeScript).

> **Goal:**

> Implement **Phase 12**, which includes *two systems that must integrate cleanly into the AGI Kernel*:

>
> 1. **Cross-Vertical Intelligence Packs (unlimited jobs)**

> 2. **Household / Couples / Family / Community AGI Mode**



This document defines:

* New DB schema

* New runtime modules

* New agents

* New integrations into AGI Kernel, Perception, Planner, and WorldState

* New user settings pages

* End-to-end implementation instructions

---

# PHASE 12 — HIGH-LEVEL OBJECTIVES

## 🎯 Objective A — Cross-Vertical Intelligence Packs

Pulse must support **any job in the world**, dynamically.

A user provides a job title (e.g., "Commercial Loan Officer", "Firefighter", "Registered Nurse", "Software Engineer"), and Pulse will:

1. **Generate a VerticalPack** using LLM synthesis

2. **Store the VerticalPack** in Supabase

3. **Install vertical-specific agents** into the AGI Kernel

4. **Add vertical reasoning** to perception, planning, and action selection

5. **Use vertical KPIs, workflows, and domain knowledge** to enhance AGI outputs

Users may have **multiple jobs**.

---

## 🎯 Objective B — Household / Couples / Family / Community Mode

Pulse must support **multi-user living environments**, including:

* Households

* Couples

* Families

* Roommates

* Small communities

New AGI capabilities must:

1. Merge calendars, tasks, routines, finances, and relationship signals

2. Create a **Household World Model**

3. Run a **Household AGI Loop** with its own agents

4. Support **couple dynamics, family rhythms, and shared planning**

5. Support permissions and privacy boundaries

6. Support shared goals, budgets, rituals, and coordination

---

# SECTION 1 — DATABASE MIGRATIONS

Create these migrations in `/supabase/migrations/`.

## 1.1. `20251230_vertical_packs_v1.sql`

```sql
-- ============================================
-- PULSE VERTICAL PACKS V1
-- User-installed job intelligence packs
-- ============================================

create table if not exists public.vertical_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  job_title text not null,
  pack jsonb not null, -- full VerticalPack structure
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vertical_packs_user_id_idx
  on public.vertical_packs(user_id);

create index if not exists vertical_packs_job_title_idx
  on public.vertical_packs(job_title);
```

---

## 1.2. `20251230_households_v1.sql`

```sql
-- ============================================
-- PULSE HOUSEHOLDS V1
-- Multi-user living environments
-- ============================================

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null default 'member', -- 'owner' | 'adult' | 'child' | 'member'
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists household_members_household_user_unique
  on public.household_members(household_id, user_id);

create index if not exists household_members_household_idx
  on public.household_members(household_id);

create index if not exists household_members_user_idx
  on public.household_members(user_id);
```

---

## 1.3. `20251230_household_data_v1.sql`

```sql
-- ============================================
-- PULSE HOUSEHOLD SHARED DATA V1
-- Shared calendars, tasks, finances, goals
-- ============================================

create table if not exists public.household_calendar_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by_user_id uuid not null references users(id),
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz,
  all_day boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists household_calendar_events_household_idx
  on public.household_calendar_events(household_id);

create table if not exists public.household_tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by_user_id uuid not null references users(id),
  assigned_to_user_id uuid references users(id),
  title text not null,
  description text,
  status text not null default 'pending',
  priority numeric not null default 0.5,
  due_date date,
  created_at timestamptz not null default now()
);

create index if not exists household_tasks_household_idx
  on public.household_tasks(household_id);

create table if not exists public.household_goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by_user_id uuid not null references users(id),
  title text not null,
  description text,
  target_date date,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create index if not exists household_goals_household_idx
  on public.household_goals(household_id);
```

---

# SECTION 2 — CROSS-VERTICAL ENGINE

Create a new directory:

`/lib/verticals/`

## 2.1. `schema.ts`

Define the VerticalPack structure.

```ts
export interface VerticalKPI {
  name: string;
  description: string;
  calculation: string; // LLM interpretable
  target?: number;
  unit?: string;
}

export interface VerticalWorkflow {
  name: string;
  steps: string[];
  frequency?: string; // 'daily', 'weekly', 'on_demand'
}

export interface VerticalDomainEntry {
  concept: string;
  explanation: string;
  importance: 'critical' | 'important' | 'nice_to_know';
}

export interface VerticalPrompts {
  agentContext: string;
  perceptionNotes: string;
  planningNotes: string;
  actionGenerationNotes?: string;
}

export interface VerticalAgentDescriptor {
  name: string;
  priority: number;
  purpose: string;
  domains: string[];
  defaultAggressiveness?: 'conservative' | 'balanced' | 'bold';
}

export interface VerticalPack {
  jobTitle: string;
  summary: string;
  kpis: VerticalKPI[];
  workflows: VerticalWorkflow[];
  domainKnowledge: VerticalDomainEntry[];
  prompts: VerticalPrompts;
  agents: VerticalAgentDescriptor[];
  scoreboards?: {
    name: string;
    kpis: string[];
  }[];
}
```

---

## 2.2. `generator.ts`

Implement vertical pack generation using LLM.

```ts
import { callAI } from '@/lib/ai/call';
import { supabaseAdmin } from '@/lib/supabase';
import { VerticalPack } from './schema';

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

export async function generateVerticalPack(
  jobTitle: string,
  userId?: string,
): Promise<VerticalPack> {
  const systemPrompt = `You are an expert job analyst. Given a job title, generate a comprehensive VerticalPack JSON structure that includes:
- jobTitle: the exact job title
- summary: 2-3 sentence description of the role
- kpis: 5-10 key performance indicators with name, description, calculation formula, and optional target/unit
- workflows: 3-7 core workflows with name, steps array, and frequency
- domainKnowledge: 10-15 critical domain concepts with concept, explanation, and importance level
- prompts: agentContext, perceptionNotes, planningNotes, actionGenerationNotes (all as strings)
- agents: 1-3 agent descriptors with name, priority (1-100), purpose, domains array, and optional defaultAggressiveness
- scoreboards: optional array of scoreboard configs with name and kpis array

Be specific, practical, and domain-accurate. Respond with JSON only.`;

  const userPrompt = `Generate a VerticalPack for the job title: "${jobTitle}"

Make it comprehensive and actionable. Include real-world KPIs, workflows, and domain knowledge that would be useful for an AI assistant helping someone in this role.`;

  const result = await callAI({
    userId: userId || 'system',
    model: 'gpt-4o-mini',
    systemPrompt,
    userPrompt,
    temperature: 0.7,
    maxTokens: 3000,
    feature: 'vertical_pack_generation',
  });

  if (result.success && result.content) {
    try {
      const parsed = JSON.parse(result.content);
      // Validate and normalize
      return {
        jobTitle: parsed.jobTitle || jobTitle,
        summary: parsed.summary || `Professional in ${jobTitle}`,
        kpis: parsed.kpis || [],
        workflows: parsed.workflows || [],
        domainKnowledge: parsed.domainKnowledge || [],
        prompts: parsed.prompts || {
          agentContext: '',
          perceptionNotes: '',
          planningNotes: '',
          actionGenerationNotes: '',
        },
        agents: parsed.agents || [],
        scoreboards: parsed.scoreboards || [],
      };
    } catch (err) {
      console.error('[Verticals] Failed to parse LLM response', err);
    }
  }

  // Fallback pack
  return {
    jobTitle,
    summary: `Professional role: ${jobTitle}`,
    kpis: [
      {
        name: 'Performance',
        description: 'Overall job performance',
        calculation: 'weighted_average(metrics)',
      },
    ],
    workflows: [
      {
        name: 'Daily Routine',
        steps: ['Plan', 'Execute', 'Review'],
        frequency: 'daily',
      },
    ],
    domainKnowledge: [],
    prompts: {
      agentContext: `You are helping a ${jobTitle}.`,
      perceptionNotes: `Consider ${jobTitle} specific context.`,
      planningNotes: `Plan actions relevant to ${jobTitle}.`,
      actionGenerationNotes: `Generate actions appropriate for ${jobTitle}.`,
    },
    agents: [],
    scoreboards: [],
  };
}

export async function installVerticalPack(
  userId: string,
  jobTitle: string,
): Promise<VerticalPack> {
  const dbUserId = await resolveUserId(userId);

  // Check if pack already exists
  const { data: existing } = await supabaseAdmin
    .from('vertical_packs')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('job_title', jobTitle)
    .eq('is_active', true)
    .maybeSingle();

  if (existing) {
    return existing.pack as VerticalPack;
  }

  // Generate new pack
  const pack = await generateVerticalPack(jobTitle, userId);

  // Save to database
  const { error } = await supabaseAdmin.from('vertical_packs').insert({
    user_id: dbUserId,
    job_title: jobTitle,
    pack,
    is_active: true,
  });

  if (error) {
    console.error('[Verticals] Failed to install pack', error);
    throw new Error('Failed to install vertical pack');
  }

  return pack;
}

export async function getUserVerticalPacks(userId: string): Promise<VerticalPack[]> {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('vertical_packs')
    .select('pack')
    .eq('user_id', dbUserId)
    .eq('is_active', true);

  if (error) {
    console.error('[Verticals] Failed to load packs', error);
    return [];
  }

  return (data || []).map((row) => row.pack as VerticalPack);
}
```

---

## 2.3. `runtime.ts`

Implement runtime helpers for vertical packs.

```ts
import { VerticalPack } from './schema';
import { getUserVerticalPacks } from './generator';

export interface VerticalContext {
  packs: VerticalPack[];
  activeKPIs: string[];
  activeWorkflows: string[];
  domainTerms: string[];
}

export async function loadUserVerticalContext(userId: string): Promise<VerticalContext> {
  const packs = await getUserVerticalPacks(userId);

  const activeKPIs = packs.flatMap((p) => p.kpis.map((k) => k.name));
  const activeWorkflows = packs.flatMap((p) => p.workflows.map((w) => w.name));
  const domainTerms = packs.flatMap((p) => p.domainKnowledge.map((d) => d.concept));

  return {
    packs,
    activeKPIs,
    activeWorkflows,
    domainTerms,
  };
}

export function getVerticalAgentContext(packs: VerticalPack[]): string {
  return packs
    .map((p) => p.prompts.agentContext)
    .filter(Boolean)
    .join('\n\n');
}

export function getVerticalPerceptionNotes(packs: VerticalPack[]): string {
  return packs
    .map((p) => p.prompts.perceptionNotes)
    .filter(Boolean)
    .join('\n\n');
}

export function getVerticalPlanningNotes(packs: VerticalPack[]): string {
  return packs
    .map((p) => p.prompts.planningNotes)
    .filter(Boolean)
    .join('\n\n');
}
```

---

# SECTION 3 — HOUSEHOLD ENGINE

Create directory:

`/lib/household/`

## 3.1. `model.ts`

Household data model functions.

```ts
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

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: 'owner' | 'adult' | 'child' | 'member';
  permissions: any;
  user?: {
    clerk_id: string;
    email?: string;
    name?: string;
  };
}

export async function getHouseholdsForUser(userId: string): Promise<any[]> {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('household_members')
    .select(`
      *,
      households (*)
    `)
    .eq('user_id', dbUserId);

  if (error) {
    console.error('[Household] Failed to load households', error);
    return [];
  }

  return (data || []).map((m: any) => ({
    id: m.household_id,
    ...m.households,
    role: m.role,
    permissions: m.permissions,
  }));
}

export async function getHouseholdMembers(householdId: string): Promise<HouseholdMember[]> {
  const { data, error } = await supabaseAdmin
    .from('household_members')
    .select(`
      *,
      users:user_id (clerk_id, email)
    `)
    .eq('household_id', householdId);

  if (error) {
    console.error('[Household] Failed to load members', error);
    return [];
  }

  return (data || []).map((m: any) => ({
    id: m.id,
    household_id: m.household_id,
    user_id: m.user_id,
    role: m.role,
    permissions: m.permissions || {},
    user: m.users || undefined,
  }));
}

export async function createHousehold(
  userId: string,
  name: string,
  description?: string,
): Promise<string> {
  const dbUserId = await resolveUserId(userId);

  const { data: household, error: householdError } = await supabaseAdmin
    .from('households')
    .insert({
      name,
      description: description || null,
    })
    .select('id')
    .single();

  if (householdError || !household) {
    throw new Error('[Household] Failed to create household');
  }

  // Add creator as owner
  const { error: memberError } = await supabaseAdmin.from('household_members').insert({
    household_id: household.id,
    user_id: dbUserId,
    role: 'owner',
    permissions: { can_manage_members: true, can_manage_finances: true },
  });

  if (memberError) {
    console.error('[Household] Failed to add owner', memberError);
  }

  return household.id;
}

export async function addHouseholdMember(
  householdId: string,
  userId: string,
  role: 'owner' | 'adult' | 'child' | 'member' = 'member',
  permissions: any = {},
): Promise<void> {
  const dbUserId = await resolveUserId(userId);

  const { error } = await supabaseAdmin.from('household_members').insert({
    household_id: householdId,
    user_id: dbUserId,
    role,
    permissions,
  });

  if (error) {
    console.error('[Household] Failed to add member', error);
    throw new Error('Failed to add household member');
  }
}
```

---

## 3.2. `worldstate.ts`

Build a **HouseholdWorldState**.

```ts
import { supabaseAdmin } from '@/lib/supabase';
import { getHouseholdMembers, HouseholdMember } from './model';
import { buildWorldState } from '@/lib/agi/worldstate';

export interface HouseholdWorldState {
  householdId: string;
  members: HouseholdMember[];
  combinedCalendar: any[];
  combinedTasks: any[];
  sharedFinances: {
    upcomingBills: any[];
    sharedGoals: any[];
    budgetStatus?: any;
  };
  routines: {
    sharedRoutines: any[];
    conflictZones: any[];
  };
  relationshipSignals: {
    stressSignals: any[];
    harmonySignals: any[];
    coordinationNeeds: any[];
  };
  stressSignals: {
    householdLoad: number;
    individualStresses: { userId: string; stress: number }[];
  };
}

export async function buildHouseholdWorldState(
  householdId: string,
): Promise<HouseholdWorldState> {
  const members = await getHouseholdMembers(householdId);

  // Load shared calendar events
  const { data: calendarEvents } = await supabaseAdmin
    .from('household_calendar_events')
    .select('*')
    .eq('household_id', householdId)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true });

  // Load shared tasks
  const { data: tasks } = await supabaseAdmin
    .from('household_tasks')
    .select('*')
    .eq('household_id', householdId)
    .in('status', ['pending', 'in_progress']);

  // Load shared goals
  const { data: goals } = await supabaseAdmin
    .from('household_goals')
    .select('*')
    .eq('household_id', householdId)
    .eq('status', 'active');

  // Build individual world states for each member to detect conflicts
  const memberWorldStates = await Promise.all(
    members.map(async (member) => {
      try {
        return await buildWorldState(member.user_id);
      } catch {
        return null;
      }
    }),
  );

  // Detect calendar conflicts
  const conflictZones: any[] = [];
  const memberCalendars = memberWorldStates
    .filter(Boolean)
    .map((ws: any) => ws.time?.upcomingEvents || [])
    .flat();

  // Simple conflict detection: overlapping events
  for (let i = 0; i < memberCalendars.length; i++) {
    for (let j = i + 1; j < memberCalendars.length; j++) {
      const e1 = memberCalendars[i];
      const e2 = memberCalendars[j];
      if (e1.start && e2.start && e1.end && e2.end) {
        const start1 = new Date(e1.start);
        const end1 = new Date(e1.end);
        const start2 = new Date(e2.start);
        const end2 = new Date(e2.end);
        if (start1 < end2 && start2 < end1) {
          conflictZones.push({ event1: e1, event2: e2 });
        }
      }
    }
  }

  // Aggregate stress signals
  const individualStresses = memberWorldStates
    .filter(Boolean)
    .map((ws: any, idx) => ({
      userId: members[idx].user_id,
      stress: ws.emotion?.currentStress || 0.5,
    }));

  const householdLoad =
    individualStresses.reduce((sum, s) => sum + s.stress, 0) / individualStresses.length;

  return {
    householdId,
    members,
    combinedCalendar: calendarEvents || [],
    combinedTasks: tasks || [],
    sharedFinances: {
      upcomingBills: [],
      sharedGoals: goals || [],
    },
    routines: {
      sharedRoutines: [],
      conflictZones,
    },
    relationshipSignals: {
      stressSignals: householdLoad > 0.7 ? [{ severity: 'high', reason: 'High household load' }] : [],
      harmonySignals: householdLoad < 0.4 ? [{ type: 'low_stress' }] : [],
      coordinationNeeds: conflictZones.length > 0 ? [{ type: 'calendar_conflict', count: conflictZones.length }] : [],
    },
    stressSignals: {
      householdLoad,
      individualStresses,
    },
  };
}
```

---

## 3.3. `householdAgent.ts`

Add a new AGI agent for household intelligence.

```ts
import { Agent, makeAgentResult } from '../agents';
import { AgentContext, AGIAction } from '../types';
import { HouseholdWorldState } from './worldstate';

export const householdAgent: Agent = {
  name: 'HouseholdAgent',
  description: 'Detects household conflicts, coordination needs, and proposes shared planning actions.',
  domains: ['relationships', 'time', 'finance'],
  priority: 90,
  defaultAggressiveness: 'balanced',

  async run(ctx: AgentContext) {
    const actions: AGIAction[] = [];
    const world: any = ctx.world;
    const households = world.households || [];

    if (households.length === 0) {
      return makeAgentResult(
        'HouseholdAgent',
        'No household data available.',
        [],
        0.1,
      );
    }

    for (const household of households) {
      const hws = household as HouseholdWorldState;

      // Detect calendar conflicts
      if (hws.routines.conflictZones.length > 0) {
        actions.push({
          type: 'log_insight',
          label: `Household has ${hws.routines.conflictZones.length} calendar conflict${hws.routines.conflictZones.length !== 1 ? 's' : ''}. Consider coordinating schedules.`,
          details: {
            domain: 'household',
            scope: 'calendar',
            conflicts: hws.routines.conflictZones,
            subsource: 'household_agent',
          },
          requiresConfirmation: false,
          riskLevel: 'low',
        });
      }

      // Detect high household stress
      if (hws.stressSignals.householdLoad > 0.7) {
        actions.push({
          type: 'nudge_user',
          label: 'Household stress is elevated. Consider a family check-in or shared downtime.',
          details: {
            message: `Household load is ${(hws.stressSignals.householdLoad * 100).toFixed(0)}%. Consider coordinating a break or shared activity.`,
            domain: 'household',
            subsource: 'household_agent',
          },
          requiresConfirmation: false,
          riskLevel: 'low',
        });
      }

      // Propose shared tasks for coordination needs
      if (hws.relationshipSignals.coordinationNeeds.length > 0) {
        actions.push({
          type: 'create_task',
          label: 'Schedule household coordination meeting',
          details: {
            title: 'Household Coordination Meeting',
            description: 'Review shared calendar, tasks, and goals to improve coordination.',
            domain: 'household',
            subsource: 'household_agent',
          },
          requiresConfirmation: true,
          riskLevel: 'low',
        });
      }

      // Propose shared goals
      if (hws.sharedFinances.sharedGoals.length === 0 && hws.members.length > 1) {
        actions.push({
          type: 'nudge_user',
          label: 'Consider setting a shared household goal',
          details: {
            message: 'Households with shared goals tend to have better coordination and harmony.',
            domain: 'household',
            subsource: 'household_agent',
          },
          requiresConfirmation: false,
          riskLevel: 'low',
        });
      }
    }

    const reasoning = `Analyzed ${households.length} household(s). Found ${actions.length} coordination opportunities.`;

    return makeAgentResult('HouseholdAgent', reasoning, actions, 0.8);
  },
};
```

---

# SECTION 4 — AGI INTEGRATION

## 4.1. Update AGI WorldState (`lib/agi/worldstate.ts`)

Add vertical and household fields to WorldState.

```ts
// Add to WorldState interface
export interface WorldState {
  // ... existing fields ...
  verticals?: VerticalPack[];
  households?: HouseholdWorldState[];
}

// In buildWorldState function, add:
import { loadUserVerticalContext } from '@/lib/verticals/runtime';
import { getHouseholdsForUser } from '@/lib/household/model';
import { buildHouseholdWorldState } from '@/lib/household/worldstate';

// Inside buildWorldState:
const verticalContext = await loadUserVerticalContext(userId);
const userHouseholds = await getHouseholdsForUser(userId);
const householdWorldStates = await Promise.all(
  userHouseholds.map((h) => buildHouseholdWorldState(h.id)),
);

const world: WorldState = {
  // ... existing fields ...
  verticals: verticalContext.packs,
  households: householdWorldStates,
};
```

---

## 4.2. Update AGI Perception

Update perception modules to be vertical and household-aware.

In `lib/agi/perception/calendar.ts`:

```ts
// Add vertical-aware event classification
if (world.verticals && world.verticals.length > 0) {
  // Use vertical workflows to classify events
  const verticalWorkflows = world.verticals.flatMap((v) => v.workflows);
  // Classify events based on workflow patterns
}

// Add household-aware conflict detection
if (world.households && world.households.length > 0) {
  // Check for household calendar conflicts
  const householdConflicts = world.households.flatMap((h) => h.routines.conflictZones);
  // Include in perception output
}
```

---

## 4.3. AGI Planner Updates

Update `lib/agi/planner.ts` to consider vertical and household factors.

```ts
// Add to PlannerOptions
interface PlannerOptions {
  maxActions?: number;
  profile?: AGIUserProfile;
  verticalPriorityWeight?: number; // default 0.1
  householdHarmonyWeight?: number; // default 0.15
}

// In planFromAgentResults, add scoring factors:
// Factor 11: Vertical KPI alignment
if (world.verticals && world.verticals.length > 0) {
  const verticalKPIs = world.verticals.flatMap((v) => v.kpis.map((k) => k.name));
  if (action.details?.kpi && verticalKPIs.includes(action.details.kpi)) {
    score += opts.verticalPriorityWeight || 0.1;
  }
}

// Factor 12: Household harmony
if (world.households && world.households.length > 0) {
  const householdConflicts = world.households.flatMap((h) => h.routines.conflictZones);
  if (action.type === 'create_task' && action.details?.domain === 'household') {
    score += opts.householdHarmonyWeight || 0.15;
  }
  // Penalize actions that might increase household stress
  if (action.riskLevel === 'high' && householdConflicts.length > 0) {
    score -= 0.1;
  }
}
```

---

## 4.4. New AGI Agents

Create `/lib/agi/agents/verticalAgent.ts`:

```ts
import { Agent, makeAgentResult } from '../agents';
import { AgentContext, AGIAction } from '../types';
import { VerticalPack } from '@/lib/verticals/schema';

export const verticalAgent: Agent = {
  name: 'VerticalAgent',
  description: 'Proposes actions based on job-specific KPIs, workflows, and domain knowledge.',
  domains: ['work'],
  priority: 85,
  defaultAggressiveness: 'balanced',

  async run(ctx: AgentContext) {
    const actions: AGIAction[] = [];
    const world: any = ctx.world;
    const verticals = world.verticals || [];

    if (verticals.length === 0) {
      return makeAgentResult(
        'VerticalAgent',
        'No vertical packs installed.',
        [],
        0.1,
      );
    }

    for (const pack of verticals) {
      const vp = pack as VerticalPack;

      // Propose actions based on KPIs
      for (const kpi of vp.kpis) {
        // Check if KPI needs attention (heuristic-based)
        actions.push({
          type: 'log_insight',
          label: `Track ${kpi.name} for ${vp.jobTitle}`,
          details: {
            domain: 'work',
            scope: 'kpi',
            kpi: kpi.name,
            jobTitle: vp.jobTitle,
            subsource: 'vertical_agent',
          },
          requiresConfirmation: false,
          riskLevel: 'low',
        });
      }

      // Propose workflow-based actions
      for (const workflow of vp.workflows) {
        if (workflow.frequency === 'daily') {
          actions.push({
            type: 'create_task',
            label: `Execute ${workflow.name} workflow`,
            details: {
              title: workflow.name,
              description: `Workflow steps: ${workflow.steps.join(', ')}`,
              domain: 'work',
              subsource: `vertical_workflow/${vp.jobTitle}`,
            },
            requiresConfirmation: false,
            riskLevel: 'low',
          });
        }
      }
    }

    const reasoning = `Analyzed ${verticals.length} vertical pack(s). Proposed ${actions.length} job-specific actions.`;

    return makeAgentResult('VerticalAgent', reasoning, actions, 0.7);
  },
};
```

---

# SECTION 5 — API ROUTES

## 5.1. `/api/verticals/install/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { installVerticalPack } from '@/lib/verticals/generator';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { jobTitle } = body;

    if (!jobTitle || typeof jobTitle !== 'string') {
      return NextResponse.json({ error: 'jobTitle is required' }, { status: 400 });
    }

    const pack = await installVerticalPack(userId, jobTitle);

    return NextResponse.json({ pack });
  } catch (err: any) {
    console.error('[API][Verticals] Install error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

## 5.2. `/api/household/create/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createHousehold } from '@/lib/household/model';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { name, description } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const householdId = await createHousehold(userId, name, description);

    return NextResponse.json({ householdId });
  } catch (err: any) {
    console.error('[API][Household] Create error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

## 5.3. `/api/household/invite/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { addHouseholdMember } from '@/lib/household/model';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { householdId, inviteeUserId, role, permissions } = body;

    if (!householdId || !inviteeUserId) {
      return NextResponse.json({ error: 'householdId and inviteeUserId are required' }, { status: 400 });
    }

    await addHouseholdMember(householdId, inviteeUserId, role, permissions);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[API][Household] Invite error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

## 5.4. `/api/household/state/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getHouseholdsForUser } from '@/lib/household/model';
import { buildHouseholdWorldState } from '@/lib/household/worldstate';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const householdId = searchParams.get('householdId');

    if (householdId) {
      const state = await buildHouseholdWorldState(householdId);
      return NextResponse.json({ state });
    }

    // Return all households for user
    const households = await getHouseholdsForUser(userId);
    return NextResponse.json({ households });
  } catch (err: any) {
    console.error('[API][Household] State error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

---

# SECTION 6 — SETTINGS UI

## 6.1. `/settings/jobs/page.tsx`

Create a settings page for managing vertical packs.

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppCard } from '@/components/ui/AppCard';

export default function JobsSettingsPage() {
  const { user } = useUser();
  const [jobTitle, setJobTitle] = useState('');
  const [installing, setInstalling] = useState(false);
  const [packs, setPacks] = useState<any[]>([]);

  useEffect(() => {
    fetchPacks();
  }, []);

  async function fetchPacks() {
    // TODO: Implement API call to fetch user's vertical packs
  }

  async function handleInstall() {
    if (!jobTitle.trim()) return;

    setInstalling(true);
    try {
      const res = await fetch('/api/verticals/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobTitle }),
      });

      if (res.ok) {
        setJobTitle('');
        fetchPacks();
      }
    } catch (err) {
      console.error('Failed to install pack', err);
    } finally {
      setInstalling(false);
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Job Intelligence Packs</h1>

      <AppCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Install New Pack</h2>
        <div className="flex gap-2">
          <Input
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Enter job title (e.g., Commercial Loan Officer)"
            className="flex-1"
          />
          <Button onClick={handleInstall} disabled={installing}>
            {installing ? 'Installing...' : 'Install'}
          </Button>
        </div>
      </AppCard>

      <AppCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Installed Packs</h2>
        {packs.length === 0 ? (
          <p className="text-white/60">No packs installed yet.</p>
        ) : (
          <div className="space-y-2">
            {packs.map((pack) => (
              <div key={pack.id} className="p-3 bg-black/30 rounded">
                <h3 className="text-white font-medium">{pack.job_title}</h3>
                <p className="text-white/60 text-sm">{pack.pack?.summary}</p>
              </div>
            ))}
          </div>
        )}
      </AppCard>
    </div>
  );
}
```

## 6.2. `/settings/household/page.tsx`

Create a settings page for managing households.

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppCard } from '@/components/ui/AppCard';

export default function HouseholdSettingsPage() {
  const { user } = useUser();
  const [householdName, setHouseholdName] = useState('');
  const [creating, setCreating] = useState(false);
  const [households, setHouseholds] = useState<any[]>([]);

  useEffect(() => {
    fetchHouseholds();
  }, []);

  async function fetchHouseholds() {
    try {
      const res = await fetch('/api/household/state');
      if (res.ok) {
        const data = await res.json();
        setHouseholds(data.households || []);
      }
    } catch (err) {
      console.error('Failed to fetch households', err);
    }
  }

  async function handleCreate() {
    if (!householdName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch('/api/household/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: householdName }),
      });

      if (res.ok) {
        setHouseholdName('');
        fetchHouseholds();
      }
    } catch (err) {
      console.error('Failed to create household', err);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Household Management</h1>

      <AppCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Create Household</h2>
        <div className="flex gap-2">
          <Input
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            placeholder="Household name"
            className="flex-1"
          />
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </AppCard>

      <AppCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Your Households</h2>
        {households.length === 0 ? (
          <p className="text-white/60">No households yet.</p>
        ) : (
          <div className="space-y-2">
            {households.map((h) => (
              <div key={h.id} className="p-3 bg-black/30 rounded">
                <h3 className="text-white font-medium">{h.name}</h3>
                <p className="text-white/60 text-sm">Role: {h.role}</p>
              </div>
            ))}
          </div>
        )}
      </AppCard>
    </div>
  );
}
```

---

# SECTION 7 — AGI REGISTRY UPDATES

Update `lib/agi/registry.ts` to conditionally include new agents.

```ts
import { Agent } from './agents';
import { butlerAgent } from './agents/butlerAgent';
import { relationshipAgent } from './agents/relationshipAgent';
import { workAgent } from './agents/workAgent';
import { financeAgent } from './agents/financeAgent';
import { simulationAgent } from './agents/simulationAgent';
import { identityAgent } from './agents/identityAgent';
import { emotionAgent } from './agents/emotionAgent';
import { executiveFunctionAgent } from './agents/executiveFunctionAgent';
import { goalsAgent } from './agents/goalsAgent';
import { verticalAgent } from './agents/verticalAgent';
import { householdAgent } from './agents/householdAgent';
import { AGIUserProfile } from './settings';
import { getUserVerticalPacks } from '@/lib/verticals/generator';
import { getHouseholdsForUser } from '@/lib/household/model';

export async function getRegisteredAgents(userId?: string, profile?: AGIUserProfile): Promise<Agent[]> {
  const baseAgents: Agent[] = [
    identityAgent, // 90
    executiveFunctionAgent, // 85
    emotionAgent, // 85
    goalsAgent, // 80
    butlerAgent, // 80
    workAgent, // 75
    relationshipAgent, // 70
    financeAgent, // 60
    simulationAgent, // 50
  ];

  // Conditionally add vertical agent
  if (userId) {
    const packs = await getUserVerticalPacks(userId);
    if (packs.length > 0) {
      baseAgents.push(verticalAgent); // 85
    }
  }

  // Conditionally add household agent
  if (userId) {
    const households = await getHouseholdsForUser(userId);
    if (households.length > 0) {
      baseAgents.push(householdAgent); // 90
    }
  }

  // Sort by priority
  return baseAgents.sort((a, b) => b.priority - a.priority);
}
```

---

# SECTION 8 — ACCEPTANCE CRITERIA

## ✔ Vertical Packs

* User enters job → vertical pack generated via LLM

* Vertical pack stored in `vertical_packs` table

* Vertical agent appears in AGI registry when packs exist

* AGI incorporates vertical KPIs + workflows in planning

* Actions reflect job-specific intelligence

## ✔ Household Mode

* User creates a household via `/api/household/create`

* Members can be added via `/api/household/invite`

* `buildHouseholdWorldState` aggregates member data

* Household agent appears in AGI registry when user belongs to household

* AGI detects calendar conflicts and household stress

* Household agent generates shared coordination actions

## ✔ AGI Integration

* WorldState includes `verticals` and `households` fields

* Perception modules are vertical and household-aware

* Planner considers vertical priority and household harmony weights

* New agents (vertical, household) run correctly

* Actions reflect both job intelligence and household intelligence

## ✔ UI & Settings

* `/settings/jobs` page allows installing vertical packs

* `/settings/household` page allows creating and managing households

* Settings pages display installed packs and household members

---

# END OF SPEC

**Implementation Order:**

1. Database migrations (Section 1)

2. Vertical engine (Section 2)

3. Household engine (Section 3)

4. AGI integration (Section 4)

5. API routes (Section 5)

6. Settings UI (Section 6)

7. Registry updates (Section 7)

8. Testing against acceptance criteria (Section 8)

**End of spec.**


