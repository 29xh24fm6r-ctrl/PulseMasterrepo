# 🧠 PULSE OS — PHASE 18 MEGA SPEC

## Memory Civilization & Third-Brain Graph v4

> **You are:** Senior Staff Engineer on Pulse OS (Next.js 16 + Supabase + TypeScript).

> **Goal:**

> Build **Third Brain Graph v4** and the **Memory Civilization Layer**:

>
> * Turn all user data (notes, calls, emails, actions, life events) into a **living, queryable knowledge graph**

> * Let Pulse answer questions like:

>
>   * "When have I felt this way before and what helped?"

>   * "Which clients are most similar to this one and how did those deals go?"

>   * "What are the major themes in my last 6 months?"

> * Enable safe, anonymous **cross-user wisdom** via aggregated "patterns" (not raw data)

> * Make the graph a **first-class module in AGI, dashboards, and coaching**

Phases 1–17 are assumed to be in place:

* AGI Kernel, multi-agent mesh, WorldState

* Vertical/job packs, Civilization Layer (scoreboards, leagues)

* Household / org / team AGI

* Voice OS + call intelligence + mobile shell

* Communication Mastery, Philosophy Dojo, Financial Brain

* Experiment Lab / Self-Optimization Engine

* Universal Memory Layer v2–3 + Third Brain v3 (basic notes/tasks/meetings/records)

---

## 0. DESIGN PRINCIPLES

1. **Everything is a node**: Events, people, feelings, tasks, deals, experiments, places, ideas… all become nodes with typed relations.

2. **User-first, private by default**: Graph is per-user (and per-org/household where appropriate). Cross-user "civilization memory" only works via *fully anonymized pattern summaries*, never raw content.

3. **AGI-native**: Graph is the **source of truth** for context and long-range patterns. AGI agents read and write to it as part of reasoning.

4. **Time-aware**: Everything has time spans, recency, and life "chapters".

5. **Multi-modal & multi-domain**: Calls, text, tasks, calendar, finances, scoreboards, experiments – everything connects.

---

# SECTION 1 — DATABASE: THIRD BRAIN GRAPH V4

Create migrations in `/supabase/migrations/`.

## 1.1. Node & Edge Core

Migration: `20260115_third_brain_graph_v4.sql`

```sql
-- ============================================
-- THIRD BRAIN GRAPH V4 CORE
-- ============================================

create table if not exists public.tb_nodes (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references users(id) on delete cascade,
  org_id uuid references organizations(id),
  household_id uuid references households(id),

  -- High-level node type: 'event', 'person', 'project', 'deal', 'emotion_state', 
  -- 'document', 'idea', 'habit', 'place', 'call', 'message', 'task', 'experiment', etc.
  type text not null,

  -- Optional foreign key back to source module (logical, not FK)
  source_table text,
  source_id text,

  -- Core properties in JSON (flattened, LLM-friendly)
  props jsonb not null default '{}'::jsonb,

  -- Time anchoring
  started_at timestamptz,
  ended_at timestamptz,

  created_at timestamptz not null default now()
);

create index if not exists tb_nodes_user_idx
  on public.tb_nodes(user_id);

create index if not exists tb_nodes_type_idx
  on public.tb_nodes(type);

create index if not exists tb_nodes_source_idx
  on public.tb_nodes(source_table, source_id);

create index if not exists tb_nodes_time_idx
  on public.tb_nodes(started_at, ended_at);

create table if not exists public.tb_edges (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references users(id) on delete cascade,

  from_node_id uuid not null references public.tb_nodes(id) on delete cascade,
  to_node_id uuid not null references public.tb_nodes(id) on delete cascade,

  -- Relationship type: 'related_to', 'caused', 'followed', 'part_of', 
  -- 'blocked_by', 'similar_to', 'works_on', 'belongs_to', etc.
  kind text not null,

  weight numeric,                     -- optional strength/confidence
  props jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists tb_edges_user_idx
  on public.tb_edges(user_id);

create index if not exists tb_edges_from_idx
  on public.tb_edges(from_node_id);

create index if not exists tb_edges_to_idx
  on public.tb_edges(to_node_id);

create index if not exists tb_edges_kind_idx
  on public.tb_edges(kind);
```

---

## 1.2. Node Type Registry & Schemas

```sql
create table if not exists public.tb_node_types (
  id uuid primary key default gen_random_uuid(),

  key text not null,                     -- 'deal', 'call', 'emotion_state', etc.
  name text not null,
  description text,

  -- JSON schema for props
  schema jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create unique index if not exists tb_node_types_key_unique
  on public.tb_node_types(key);
```

---

## 1.3. Chapters & Life Slices

```sql
create table if not exists public.tb_chapters (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references users(id) on delete cascade,

  title text not null,               -- 'Q4 2025: The Loan Officer Grind'
  summary_md text not null,          -- markdown narrative

  period_start date not null,
  period_end date not null,

  -- Key tags/themes
  tags text[],

  -- Link to representative node ids (e.g. major events)
  key_node_ids uuid[],

  created_at timestamptz not null default now()
);

create index if not exists tb_chapters_user_idx
  on public.tb_chapters(user_id);

create index if not exists tb_chapters_period_idx
  on public.tb_chapters(period_start, period_end);
```

---

# SECTION 2 — GRAPH ENGINE MODULES

Create directory: `/lib/thirdbrain/graph/`.

## 2.1. Node & Edge Service

`/lib/thirdbrain/graph/service.ts`

```ts
import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export type TBNodeType =
  | 'event'
  | 'person'
  | 'deal'
  | 'project'
  | 'call'
  | 'message'
  | 'emotion_state'
  | 'task'
  | 'habit'
  | 'experiment'
  | 'idea'
  | 'finance_event'
  | 'household_event'
  | 'training_session';

export interface CreateNodeInput {
  userId: string;
  orgId?: string | null;
  householdId?: string | null;
  type: TBNodeType;
  sourceTable?: string;
  sourceId?: string;
  props: Record<string, any>;
  startedAt?: string;
  endedAt?: string;
}

export async function createNode(input: CreateNodeInput): Promise<string> {
  const dbUserId = await resolveUserId(input.userId);

  const { data, error } = await supabaseAdmin
    .from('tb_nodes')
    .insert({
      user_id: dbUserId,
      org_id: input.orgId || null,
      household_id: input.householdId || null,
      type: input.type,
      source_table: input.sourceTable || null,
      source_id: input.sourceId || null,
      props: input.props,
      started_at: input.startedAt || null,
      ended_at: input.endedAt || null,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error('Failed to create graph node');
  }

  return data.id;
}

export interface CreateEdgeInput {
  userId: string;
  fromNodeId: string;
  toNodeId: string;
  kind: string;
  weight?: number;
  props?: Record<string, any>;
}

export async function createEdge(input: CreateEdgeInput): Promise<string> {
  const dbUserId = await resolveUserId(input.userId);

  const { data, error } = await supabaseAdmin
    .from('tb_edges')
    .insert({
      user_id: dbUserId,
      from_node_id: input.fromNodeId,
      to_node_id: input.toNodeId,
      kind: input.kind,
      weight: input.weight || null,
      props: input.props || {},
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error('Failed to create graph edge');
  }

  return data.id;
}

export async function linkNodes(
  userId: string,
  fromNodeId: string,
  toNodeId: string,
  kind: string,
  weight?: number,
  props?: Record<string, any>,
): Promise<string> {
  return createEdge({
    userId,
    fromNodeId,
    toNodeId,
    kind,
    weight,
    props,
  });
}

export async function getNodeBySource(
  userId: string,
  sourceTable: string,
  sourceId: string,
): Promise<any | null> {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('tb_nodes')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('source_table', sourceTable)
    .eq('source_id', sourceId)
    .maybeSingle();

  if (error) {
    console.error('[Graph] Failed to get node by source', error);
    return null;
  }

  return data;
}

export async function getNode(nodeId: string): Promise<any | null> {
  const { data, error } = await supabaseAdmin
    .from('tb_nodes')
    .select('*')
    .eq('id', nodeId)
    .maybeSingle();

  if (error) {
    console.error('[Graph] Failed to get node', error);
    return null;
  }

  return data;
}

export async function getEdgesForNode(
  userId: string,
  nodeId: string,
  direction: 'in' | 'out' | 'both' = 'both',
): Promise<any[]> {
  const dbUserId = await resolveUserId(userId);

  const queries: any[] = [];

  if (direction === 'in' || direction === 'both') {
    queries.push(
      supabaseAdmin
        .from('tb_edges')
        .select('*, from_node:tb_nodes!tb_edges_from_node_id_fkey(*)')
        .eq('user_id', dbUserId)
        .eq('to_node_id', nodeId),
    );
  }

  if (direction === 'out' || direction === 'both') {
    queries.push(
      supabaseAdmin
        .from('tb_edges')
        .select('*, to_node:tb_nodes!tb_edges_to_node_id_fkey(*)')
        .eq('user_id', dbUserId)
        .eq('from_node_id', nodeId),
    );
  }

  const results = await Promise.all(queries);
  const edges: any[] = [];

  for (const result of results) {
    if (result.data) {
      edges.push(...result.data);
    }
  }

  return edges;
}
```

---

## 2.2. Module Adapters (Memory Ingestion → Graph)

Create `/lib/thirdbrain/graph/adapters/`.

### `calls_adapter.ts`

```ts
import { supabaseAdmin } from '@/lib/supabase';
import { createNode, linkNodes, getNodeBySource } from '../service';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function syncCallToGraph(userId: string, callId: string): Promise<void> {
  const dbUserId = await resolveUserId(userId);

  // Get call data
  const { data: call } = await supabaseAdmin
    .from('call_sessions')
    .select('*, call_summaries(*)')
    .eq('id', callId)
    .single();

  if (!call) return;

  const summary = (call as any).call_summaries?.[0];

  // Check if node already exists
  let nodeId = await getNodeBySource(userId, 'call_sessions', callId);
  if (nodeId) {
    nodeId = nodeId.id;
  } else {
    // Create call node
    nodeId = await createNode({
      userId,
      type: 'call',
      sourceTable: 'call_sessions',
      sourceId: callId,
      props: {
        direction: call.direction,
        from_number: call.from_number,
        to_number: call.to_number,
        summary: summary?.high_level_summary || '',
        duration: call.ended_at && call.started_at
          ? new Date(call.ended_at).getTime() - new Date(call.started_at).getTime()
          : null,
      },
      startedAt: call.started_at,
      endedAt: call.ended_at,
    });
  }

  // Link to contacts (if we have contact nodes)
  // This would require contact/relationship lookup
  // For now, placeholder

  // Link to deals if mentioned in summary
  if (summary?.entities) {
    for (const entity of summary.entities || []) {
      if (entity.type === 'deal' && entity.name) {
        // Find deal node
        const { data: deals } = await supabaseAdmin
          .from('deals')
          .select('id')
          .eq('user_id', dbUserId)
          .ilike('name', `%${entity.name}%`)
          .limit(1);

        if (deals && deals.length > 0) {
          const dealNode = await getNodeBySource(userId, 'deals', deals[0].id);
          if (dealNode) {
            await linkNodes(userId, nodeId, dealNode.id, 'related_to', 0.8);
          }
        }
      }
    }
  }
}
```

### `deals_adapter.ts`

```ts
import { supabaseAdmin } from '@/lib/supabase';
import { createNode, linkNodes, getNodeBySource } from '../service';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function syncDealToGraph(userId: string, dealId: string): Promise<void> {
  const dbUserId = await resolveUserId(userId);

  // Get deal data
  const { data: deal } = await supabaseAdmin
    .from('deals')
    .select('*, banking_deal_profiles(*)')
    .eq('id', dealId)
    .single();

  if (!deal) return;

  const profile = (deal as any).banking_deal_profiles?.[0];

  // Check if node exists
  let nodeId = await getNodeBySource(userId, 'deals', dealId);
  if (nodeId) {
    nodeId = nodeId.id;
  } else {
    // Create deal node
    nodeId = await createNode({
      userId,
      type: 'deal',
      sourceTable: 'deals',
      sourceId: dealId,
      props: {
        name: deal.name,
        status: deal.status,
        facility_type: profile?.facility_type,
        requested_amount: profile?.requested_amount,
        dscr: profile?.dscr,
        ltv: profile?.ltv,
      },
      startedAt: deal.created_at,
    });
  }
}
```

### `experiments_adapter.ts`

```ts
import { supabaseAdmin } from '@/lib/supabase';
import { createNode, linkNodes, getNodeBySource } from '../service';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function syncExperimentToGraph(userId: string, experimentId: string): Promise<void> {
  const dbUserId = await resolveUserId(userId);

  // Get experiment
  const { data: experiment } = await supabaseAdmin
    .from('user_experiments')
    .select('*, user_experiment_results(*)')
    .eq('id', experimentId)
    .single();

  if (!experiment) return;

  const result = (experiment as any).user_experiment_results?.[0];

  // Create experiment node
  let nodeId = await getNodeBySource(userId, 'user_experiments', experimentId);
  if (nodeId) {
    nodeId = nodeId.id;
  } else {
    nodeId = await createNode({
      userId,
      type: 'experiment',
      sourceTable: 'user_experiments',
      sourceId: experimentId,
      props: {
        name: experiment.name,
        domain: experiment.domain,
        hypothesis: experiment.hypothesis,
        recommendation: result?.summary?.recommendation || 'inconclusive',
      },
      startedAt: experiment.start_date,
      endedAt: experiment.end_date,
    });
  }
}
```

---

## 2.3. Chapter / Compression Engine

Create `/lib/thirdbrain/graph/chapters.ts`

```ts
import { supabaseAdmin } from '@/lib/supabase';
import { callAI } from '@/lib/ai/call';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function generateChapterForPeriod(
  userId: string,
  periodStart: string,
  periodEnd: string,
): Promise<string> {
  const dbUserId = await resolveUserId(userId);

  // Fetch key nodes within time range
  const { data: nodes } = await supabaseAdmin
    .from('tb_nodes')
    .select('*')
    .eq('user_id', dbUserId)
    .gte('started_at', periodStart)
    .lte('started_at', periodEnd)
    .order('started_at', { ascending: false })
    .limit(50);

  if (!nodes || nodes.length === 0) {
    throw new Error('No nodes found for period');
  }

  // Select most important nodes (heuristic: deals, experiments, high-stress emotion states)
  const importantNodes = nodes.filter((n: any) => {
    const type = n.type;
    return (
      type === 'deal' ||
      type === 'experiment' ||
      (type === 'emotion_state' && (n.props?.stress || 0) > 0.7) ||
      type === 'call'
    );
  });

  // Build context for LLM
  const nodeSummaries = importantNodes
    .slice(0, 20)
    .map((n: any) => `${n.type}: ${JSON.stringify(n.props).slice(0, 100)}`)
    .join('\n');

  const systemPrompt = `You are a biographer summarizing a period of someone's life. Create a compelling chapter title, summary, and tags based on the events and patterns.`;

  const userPrompt = `Period: ${periodStart} to ${periodEnd}

Key events and nodes:
${nodeSummaries}

Generate:
1. A compelling chapter title (2-8 words)
2. A 3-5 paragraph narrative summary in markdown
3. 3-7 tags (single words or short phrases)

Respond with JSON: { "title": "...", "summary_md": "...", "tags": [...] }`;

  const result = await callAI({
    userId,
    model: 'gpt-4o-mini',
    systemPrompt,
    userPrompt,
    temperature: 0.7,
    maxTokens: 1000,
    feature: 'chapter_generation',
  });

  let parsed: any = {};
  if (result.success && result.content) {
    try {
      parsed = JSON.parse(result.content);
    } catch {
      // Fallback
      parsed = {
        title: `Period: ${periodStart} to ${periodEnd}`,
        summary_md: 'This period included various activities and events.',
        tags: [],
      };
    }
  }

  // Get key node IDs
  const keyNodeIds = importantNodes.slice(0, 10).map((n: any) => n.id);

  // Create chapter
  const { data: chapter, error } = await supabaseAdmin
    .from('tb_chapters')
    .insert({
      user_id: dbUserId,
      title: parsed.title || `Period: ${periodStart} to ${periodEnd}`,
      summary_md: parsed.summary_md || 'Summary not available.',
      period_start: periodStart,
      period_end: periodEnd,
      tags: parsed.tags || [],
      key_node_ids: keyNodeIds,
    })
    .select('id')
    .single();

  if (error || !chapter) {
    throw new Error('Failed to create chapter');
  }

  return chapter.id;
}
```

---

# SECTION 3 — MEMORY CIVILIZATION LAYER

## 3.1. Pattern Registry

Migration: `20260115_memory_civilization_v1.sql`

```sql
-- ============================================
-- MEMORY CIVILIZATION LAYER
-- Cross-user anonymized patterns
-- ============================================

create table if not exists public.civilization_patterns (
  id uuid primary key default gen_random_uuid(),

  -- Domain and pattern key
  domain text not null,            -- 'focus', 'finance', 'communication', 'relationships', 'career'
  key text not null,               -- 'weekly_review_helps_overwhelm', etc.

  -- Human-readable summary
  title text not null,
  description_md text not null,

  -- JSON structure describing pattern like: 
  -- { "if": {...}, "then": {...}, "confidence": 0.82 }
  pattern jsonb not null,

  -- Aggregated stats (not user-level)
  stats jsonb not null,            -- { "sample_size": 1342, "effect_size": 0.18, ... }

  created_at timestamptz not null default now()
);

create unique index if not exists civilization_patterns_key_unique
  on public.civilization_patterns(domain, key);

create index if not exists civilization_patterns_domain_idx
  on public.civilization_patterns(domain);
```

---

## 3.2. Pattern Feeder

Create: `/lib/civilization/memory_patterns.ts`

```ts
import { supabaseAdmin } from '@/lib/supabase';

export async function seedDefaultPatterns(): Promise<void> {
  const patterns = [
    {
      domain: 'focus',
      key: 'weekly_review_helps_overwhelm',
      title: 'Weekly Review Reduces Overwhelm',
      description_md: 'Users who adopted weekly planning and review rituals during periods of high overwhelm saw improvements in focus and task completion.',
      pattern: {
        if: {
          context: 'high_overwhelm',
          intervention: 'weekly_planning_plus_review',
        },
        then: {
          metric: 'daily_focus_score',
          change: '+12%',
        },
        confidence: 0.74,
      },
      stats: {
        sample_size: 342,
        effect_size: 0.18,
        p_value: 0.01,
      },
    },
    {
      domain: 'communication',
      key: 'pre_call_warmup_improves_quality',
      title: 'Pre-Call Warmup Improves Communication Quality',
      description_md: 'Users who did communication drills before important calls saw measurable improvements in call quality scores.',
      pattern: {
        if: {
          context: 'important_call',
          intervention: 'pre_call_warmup',
        },
        then: {
          metric: 'communication_quality_score',
          change: '+15%',
        },
        confidence: 0.68,
      },
      stats: {
        sample_size: 189,
        effect_size: 0.22,
        p_value: 0.02,
      },
    },
  ];

  for (const pattern of patterns) {
    await supabaseAdmin
      .from('civilization_patterns')
      .upsert(pattern, { onConflict: 'domain,key' });
  }
}
```

---

# SECTION 4 — AGI INTEGRATION

## 4.1. WorldState Enrichment

Update `lib/agi/worldstate.ts`:

```ts
// Add to WorldState interface
export interface WorldState {
  // ... existing fields ...
  memoryGraph?: {
    keyPeople: any[];
    keyProjects: any[];
    recentHighlights: any[];
    currentChapter?: {
      title: string;
      summary: string;
      tags: string[];
    };
  };
}

// In buildWorldState function, add:
import { supabaseAdmin } from '@/lib/supabase';

// Inside buildWorldState:
const dbUserId = await resolveUserId(userId);

// Get key people nodes
const { data: peopleNodes } = await supabaseAdmin
  .from('tb_nodes')
  .select('*')
  .eq('user_id', dbUserId)
  .eq('type', 'person')
  .order('created_at', { ascending: false })
  .limit(10);

// Get key project/deal nodes
const { data: projectNodes } = await supabaseAdmin
  .from('tb_nodes')
  .select('*')
  .eq('user_id', dbUserId)
  .in('type', ['deal', 'project'])
  .order('created_at', { ascending: false })
  .limit(10);

// Get recent highlights (important events)
const { data: highlightNodes } = await supabaseAdmin
  .from('tb_nodes')
  .select('*')
  .eq('user_id', dbUserId)
  .in('type', ['call', 'experiment', 'emotion_state'])
  .order('started_at', { ascending: false })
  .limit(5);

// Get current chapter
const now = new Date().toISOString().split('T')[0];
const { data: currentChapter } = await supabaseAdmin
  .from('tb_chapters')
  .select('*')
  .eq('user_id', dbUserId)
  .lte('period_start', now)
  .gte('period_end', now)
  .order('period_end', { ascending: false })
  .limit(1)
  .maybeSingle();

world.memoryGraph = {
  keyPeople: (peopleNodes || []).map((n: any) => ({
    id: n.id,
    name: n.props?.name || 'Unknown',
    role: n.props?.role,
  })),
  keyProjects: (projectNodes || []).map((n: any) => ({
    id: n.id,
    name: n.props?.name || 'Unknown',
    status: n.props?.status,
  })),
  recentHighlights: (highlightNodes || []).map((n: any) => ({
    id: n.id,
    type: n.type,
    summary: n.props?.summary || n.props?.name,
  })),
  currentChapter: currentChapter
    ? {
        title: currentChapter.title,
        summary: currentChapter.summary_md.slice(0, 200),
        tags: currentChapter.tags || [],
      }
    : undefined,
};
```

---

## 4.2. Graph Query Helper for Agents

Create: `/lib/thirdbrain/graph/query.ts`

```ts
import { supabaseAdmin } from '@/lib/supabase';
import { getNode, getEdgesForNode } from './service';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function findSimilarDeals(
  userId: string,
  dealNodeId: string,
  limit: number = 5,
): Promise<any[]> {
  const dealNode = await getNode(dealNodeId);
  if (!dealNode) return [];

  const dbUserId = await resolveUserId(userId);

  // Find deals with similar properties
  const { data: similar } = await supabaseAdmin
    .from('tb_nodes')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('type', 'deal')
    .neq('id', dealNodeId)
    .limit(limit);

  // Simple similarity: same facility type or similar amount range
  const dealProps = dealNode.props || {};
  const similarDeals = (similar || []).filter((n: any) => {
    const props = n.props || {};
    return (
      props.facility_type === dealProps.facility_type ||
      (props.requested_amount &&
        dealProps.requested_amount &&
        Math.abs(props.requested_amount - dealProps.requested_amount) /
          dealProps.requested_amount <
          0.3)
    );
  });

  return similarDeals;
}

export async function findSimilarEmotionEpisodes(
  userId: string,
  emotionNodeId: string,
  limit: number = 5,
): Promise<any[]> {
  const emotionNode = await getNode(emotionNodeId);
  if (!emotionNode) return [];

  const dbUserId = await resolveUserId(userId);
  const emotionProps = emotionNode.props || {};

  // Find similar emotion states
  const { data: similar } = await supabaseAdmin
    .from('tb_nodes')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('type', 'emotion_state')
    .neq('id', emotionNodeId)
    .limit(limit * 2);

  // Filter by similar stress/emotion level
  const similarEpisodes = (similar || []).filter((n: any) => {
    const props = n.props || {};
    const stressDiff = Math.abs((props.stress || 0) - (emotionProps.stress || 0));
    return stressDiff < 0.2;
  });

  return similarEpisodes.slice(0, limit);
}

export async function findRelatedPeopleToProject(
  userId: string,
  projectNodeId: string,
): Promise<any[]> {
  const edges = await getEdgesForNode(userId, projectNodeId, 'both');
  const people: any[] = [];

  for (const edge of edges) {
    const relatedNode = edge.from_node_id === projectNodeId ? edge.to_node : edge.from_node;
    if (relatedNode && relatedNode.type === 'person') {
      people.push(relatedNode);
    }
  }

  return people;
}

export async function findPastEventsWithTag(
  userId: string,
  tag: string,
  limit: number = 10,
): Promise<any[]> {
  const dbUserId = await resolveUserId(userId);

  // Search in chapters first
  const { data: chapters } = await supabaseAdmin
    .from('tb_chapters')
    .select('key_node_ids')
    .eq('user_id', dbUserId)
    .contains('tags', [tag])
    .limit(5);

  const nodeIds: string[] = [];
  chapters?.forEach((c: any) => {
    if (c.key_node_ids) {
      nodeIds.push(...c.key_node_ids);
    }
  });

  if (nodeIds.length === 0) return [];

  // Get nodes
  const { data: nodes } = await supabaseAdmin
    .from('tb_nodes')
    .select('*')
    .eq('user_id', dbUserId)
    .in('id', nodeIds)
    .limit(limit);

  return nodes || [];
}
```

---

## 4.3. MemoryCoachAgent v3

Create: `lib/agi/agents/memoryCoachAgent.ts`

```ts
import { Agent, makeAgentResult } from '../agents';
import { AgentContext, AGIAction } from '../types';
import { findSimilarEmotionEpisodes, findPastEventsWithTag } from '@/lib/thirdbrain/graph/query';
import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export const memoryCoachAgent: Agent = {
  name: 'MemoryCoachAgent',
  description: 'Uses memory graph and chapters to provide insights about patterns, similar past events, and life themes.',
  domains: ['identity', 'relationships', 'work'],
  priority: 80,
  defaultAggressiveness: 'balanced',

  async run(ctx: AgentContext) {
    const actions: AGIAction[] = [];
    const world: any = ctx.world;
    const memoryGraph = world.memoryGraph;

    if (!memoryGraph) {
      return makeAgentResult(
        'MemoryCoachAgent',
        'No memory graph data available.',
        [],
        0.1,
      );
    }

    // Check for high stress and find similar past episodes
    const currentStress = world.emotion?.currentStress || 0;
    if (currentStress > 0.7) {
      // Find similar past emotion episodes
      const { data: emotionNodes } = await supabaseAdmin
        .from('tb_nodes')
        .select('id')
        .eq('user_id', await resolveUserId(ctx.userId))
        .eq('type', 'emotion_state')
        .gt('props->>stress', '0.7')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (emotionNodes) {
        const similar = await findSimilarEmotionEpisodes(ctx.userId, emotionNodes.id, 3);
        if (similar.length > 0) {
          actions.push({
            type: 'log_insight',
            label: 'You\'ve felt this way before',
            details: {
              message: `You've had ${similar.length} similar high-stress episodes in the past. What helped then might help now.`,
              domain: 'memory',
              subsource: 'memory_coach_agent',
            },
            requiresConfirmation: false,
            riskLevel: 'low',
          });
        }
      }
    }

    // Use current chapter for context
    if (memoryGraph.currentChapter) {
      actions.push({
        type: 'nudge_user',
        label: `Current life chapter: ${memoryGraph.currentChapter.title}`,
        details: {
          message: `You're in a period defined by: ${memoryGraph.currentChapter.tags?.join(', ') || 'various themes'}. This context might help you make decisions.`,
          domain: 'memory',
          subsource: 'memory_coach_agent',
        },
        requiresConfirmation: false,
        riskLevel: 'low',
      });
    }

    // Check for civilization patterns that might help
    const { data: patterns } = await supabaseAdmin
      .from('civilization_patterns')
      .select('*')
      .in('domain', ['focus', 'communication', 'finance'])
      .limit(3);

    if (patterns && patterns.length > 0 && currentStress > 0.6) {
      const relevantPattern = patterns[0];
      actions.push({
        type: 'nudge_user',
        label: `Pattern from Pulse Nation: ${relevantPattern.title}`,
        details: {
          message: relevantPattern.description_md.slice(0, 200),
          domain: 'memory',
          subsource: 'memory_coach_agent',
          metadata: {
            patternKey: relevantPattern.key,
          },
        },
        requiresConfirmation: false,
        riskLevel: 'low',
      });
    }

    const reasoning = `Analyzed memory graph. Found ${memoryGraph.keyPeople?.length || 0} key people, ${memoryGraph.keyProjects?.length || 0} projects, and current chapter context.`;

    return makeAgentResult('MemoryCoachAgent', reasoning, actions, 0.7);
  },
};
```

---

# SECTION 5 — API: GRAPH & MEMORY QUERIES

## 5.1. Node & Neighborhood Queries

`app/api/thirdbrain/graph/node/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getNode, getEdgesForNode } from '@/lib/thirdbrain/graph/service';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const nodeId = searchParams.get('id');

    if (!nodeId) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const node = await getNode(nodeId);
    if (!node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    const edges = await getEdgesForNode(userId, nodeId, 'both');

    return NextResponse.json({ node, edges });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

---

## 5.2. Life Chapter API

`app/api/thirdbrain/chapters/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const dbUserId = await resolveUserId(userId);

    const { data, error } = await supabaseAdmin
      .from('tb_chapters')
      .select('*')
      .eq('user_id', dbUserId)
      .order('period_start', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ chapters: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

---

# SECTION 6 — UI: MEMORY GRAPH & CHAPTERS

Create: `app/(authenticated)/memory/graph/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { AppCard } from '@/components/ui/AppCard';
import { useRouter } from 'next/navigation';

export default function MemoryGraphPage() {
  const router = useRouter();
  const [keyPeople, setKeyPeople] = useState<any[]>([]);
  const [keyProjects, setKeyProjects] = useState<any[]>([]);
  const [recentHighlights, setRecentHighlights] = useState<any[]>([]);

  useEffect(() => {
    fetchGraphData();
  }, []);

  async function fetchGraphData() {
    // This would come from WorldState or a dedicated API
    // For now, placeholder
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Memory Graph</h1>

      <AppCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Key People</h2>
        {keyPeople.length === 0 ? (
          <p className="text-white/60">No people nodes yet.</p>
        ) : (
          <div className="space-y-2">
            {keyPeople.map((person) => (
              <div key={person.id} className="p-3 bg-black/30 rounded">
                <h3 className="text-white font-medium">{person.name}</h3>
                {person.role && (
                  <p className="text-white/60 text-sm">{person.role}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </AppCard>

      <AppCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Key Projects & Deals</h2>
        {keyProjects.length === 0 ? (
          <p className="text-white/60">No project nodes yet.</p>
        ) : (
          <div className="space-y-2">
            {keyProjects.map((project) => (
              <div key={project.id} className="p-3 bg-black/30 rounded">
                <h3 className="text-white font-medium">{project.name}</h3>
                {project.status && (
                  <p className="text-white/60 text-sm">Status: {project.status}</p>
                )}
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

# SECTION 7 — VOICE: MEMORY & LIFE STORY

## 7.1. Voice Intents

Update `lib/voice/intent_detector.ts`:

```ts
// Add memory detection
if (
  lowerText.includes('felt this way') ||
  lowerText.includes('dealt with') ||
  lowerText.includes('season of my life') ||
  lowerText.includes('patterns') ||
  lowerText.includes('remember when')
) {
  return {
    route: 'memory',
    intent: extractMemoryIntent(text),
  };
}
```

## 7.2. Voice Route: Memory

Create: `lib/voice/routes/memory.ts`

```ts
import { VoiceRouteResult } from '../router';
import { findSimilarEmotionEpisodes } from '@/lib/thirdbrain/graph/query';
import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function handleMemoryVoiceTurn(params: {
  userId: string;
  sessionId: string;
  text: string;
  intent: any;
}): Promise<VoiceRouteResult> {
  const lowerText = params.text.toLowerCase();
  const dbUserId = await resolveUserId(params.userId);

  // "When have I felt this way before?"
  if (lowerText.includes('felt this way')) {
    // Get current emotion state
    const { data: currentEmotion } = await supabaseAdmin
      .from('tb_nodes')
      .select('id')
      .eq('user_id', dbUserId)
      .eq('type', 'emotion_state')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (currentEmotion) {
      const similar = await findSimilarEmotionEpisodes(params.userId, currentEmotion.id, 3);
      if (similar.length > 0) {
        return {
          route: 'memory',
          text: `You've had ${similar.length} similar emotional episodes in the past. I can show you what was happening then and what helped. Check your Memory Graph for details.`,
        };
      }
    }
    return {
      route: 'memory',
      text: "I don't see similar past episodes in your memory graph yet. Keep using Pulse and I'll learn your patterns over time.",
    };
  }

  // "What defines this season of my life?"
  if (lowerText.includes('season') || lowerText.includes('chapter')) {
    const now = new Date().toISOString().split('T')[0];
    const { data: chapter } = await supabaseAdmin
      .from('tb_chapters')
      .select('*')
      .eq('user_id', dbUserId)
      .lte('period_start', now)
      .gte('period_end', now)
      .order('period_end', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (chapter) {
      return {
        route: 'memory',
        text: `This season is titled "${chapter.title}". ${chapter.summary_md.slice(0, 200)}...`,
      };
    }
    return {
      route: 'memory',
      text: "I haven't generated a chapter for your current period yet. Would you like me to create one?",
    };
  }

  return {
    route: 'memory',
    text: "I can help you explore your memory graph. Try asking 'When have I felt this way before?' or 'What defines this season of my life?'",
  };
}
```

---

# SECTION 8 — PRIVACY & CIVILIZATION SAFETY

Hard rules:

1. **No raw content leaves user boundary**: `civilization_patterns` only contain aggregate, de-identified, abstract patterns.

2. **Opt-in for pattern contribution**: Add flag to user settings like `contribute_anonymous_patterns`.

3. **Pattern text cannot contain unique identifiers**: LLM prompts must explicitly exclude names, companies, or identifying info.

4. **User-owned memory**: Third Brain Graph v4 is inside user's vault; clearly documented as their data, exportable.

---

# SECTION 9 — ACCEPTANCE CRITERIA

Phase 18 is **complete** when:

### ✅ Graph v4

1. `tb_nodes`, `tb_edges`, `tb_chapters`, and `tb_node_types` tables exist and are populated for at least:
   * Calls
   * Deals/projects
   * Key emotion episodes
   * Experiments
   * A few tasks/events

2. You can create and view nodes via `memory/graph` UI.

### ✅ Chapter Summaries

1. `generateChapterForPeriod` successfully creates a chapter with title, summary, tags, and linked node IDs.

2. `/memory/chapters` shows a list of chapters and details.

### ✅ AGI Integration

1. WorldState includes short memoryGraph summary.

2. MemoryCoachAgent uses graph + chapters to produce actionable insights.

3. Other agents can use graph queries where appropriate.

### ✅ Memory Civilization

1. `civilization_patterns` contains at least a small curated set of patterns.

2. `/api/civilization/patterns` returns safe, aggregated patterns.

3. MemoryCoachAgent references patterns in reasoning when relevant.

### ✅ Voice

1. User can ask:
   * "What defines this season of my life?" and receive a coherent chapter-based answer.
   * "When was the last time I dealt with a situation like this?" and get graph-based recall.

### ✅ Privacy

1. Users can opt out of contributing to civilization patterns.

2. No PII or raw memory content is ever exposed across users.

3. All cross-user logic is aggregated, de-identified, and pattern-only.

---

**End of spec.**


