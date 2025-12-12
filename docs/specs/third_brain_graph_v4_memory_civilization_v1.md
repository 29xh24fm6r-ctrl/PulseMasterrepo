# Third Brain Graph v4 + Memory Civilization v1

## Implementation Status

✅ **COMPLETE** - All phases implemented:

### Database Schema
- ✅ 7 tables created:
  - knowledge_nodes (core nodes: people, projects, deals, notes, etc.)
  - knowledge_edges (relationships between nodes)
  - knowledge_contexts (contextual buckets: meetings, days, sessions)
  - knowledge_context_links (link nodes/edges to contexts)
  - memory_events (fine-grained memory touches)
  - civilization_domains (macro-domains: work, family, health, etc.)
  - civilization_domain_mappings (map nodes to domains)
  - civilization_domain_state (aggregated state per domain)

### Core Modules
- ✅ `lib/thirdbrain/graph/types.ts` - Type definitions
- ✅ `lib/thirdbrain/graph/indexer.ts` - Graph indexing (upsert nodes, link nodes, record events, recompute importance)
- ✅ `lib/thirdbrain/graph/query.ts` - Graph querying (ego network, search, top nodes)
- ✅ `lib/thirdbrain/civilization/engine.ts` - Civilization engine (seed domains, map nodes, compute states)
- ✅ `lib/thirdbrain/civilization/narrator.ts` - Civilization narrator

### API Endpoints
- ✅ `GET /api/third-brain/graph/top-nodes` - Get top nodes by importance
- ✅ `GET /api/third-brain/graph/ego` - Get ego network for a node
- ✅ `GET /api/third-brain/graph/search` - Search the graph
- ✅ `POST /api/third-brain/civilization/refresh` - Refresh domain states
- ✅ `GET /api/third-brain/civilization/state` - Get domain states
- ✅ `GET /api/third-brain/civilization/narrative` - Get civilization narrative

---

## Overview

Third Brain Graph v4 + Memory Civilization v1 transforms Pulse into a **living knowledge graph** of the user's life, with a civilization layer that tracks the health of different life domains.

### Key Concepts

1. **Knowledge Graph**: Unified graph of everything (people, deals, ideas, goals, events, documents, memories)
2. **Graph Engine**: Indexing, querying, and scoring importance over time
3. **Memory Civilization**: "Cities/factions" representing life themes (Work, Family, Pulse, Money, Health, etc.) with health/activity/tension scores
4. **Deep Integration**: Hooks into Mythic, Boardroom, and Coaches to read/write graph insights

---

## Database Schema

### knowledge_nodes
Core nodes in the graph:
- kind: person, project, deal, note, task, event, goal, concept, place, memory
- external_ref: optional reference to external systems (e.g., 'crm:contact:123')
- importance: 0-10 relative importance (computed from memory events)
- last_touched_at: recency tracking

### knowledge_edges
Relationships between nodes:
- relation: related_to, part_of, depends_on, conflicts_with, supports, mentor_of, owns, etc.
- weight: relationship strength (0-10)
- direction: directed or undirected

### knowledge_contexts
Contextual buckets:
- kind: meeting, day, session, document, call, journal
- Groups nodes & edges by context

### memory_events
Fine-grained memory touches:
- source: email, calendar, note, voice, task, deal, manual
- action: created, updated, mentioned, viewed, linked
- weight: importance of the event
- Drives recency/importance computation

### civilization_domains
Macro-domains representing "cities/factions":
- key: work, family, pulse, health, money, learning, relationships, home
- Default domains seeded on first use

### civilization_domain_mappings
Map nodes into domains:
- A node can belong to multiple domains
- weight: strength of mapping

### civilization_domain_state
Aggregated state per domain:
- activity_score: current engagement/attention (0-100)
- tension_score: conflicts/overload (0-100)
- health_score: overall domain health (0-100)
- summary: human-readable summary
- Snapshot per date

---

## Core Functionality

### Graph Indexer

`upsertNodeFromEntity()`:
- Creates or updates a knowledge node
- Checks for existing node by external_ref
- Updates last_touched_at

`linkNodes()`:
- Creates or updates an edge between nodes
- Prevents self-loops
- Updates weight if edge exists

`recordMemoryEvent()`:
- Records a memory touch event
- Updates node's last_touched_at
- Used to compute importance

`recomputeNodeImportance()`:
- Computes importance from memory events in last 90 days
- Applies time decay (half-life of 30 days)
- Normalizes to 0-10 scale

### Graph Query Engine

`getEgoNetwork()`:
- BFS traversal from a center node
- Configurable depth (default: 2)
- Returns nodes and edges within network

`searchGraph()`:
- Textual search by title/summary/tags
- Optional kind filter
- Returns matching nodes and edges between them

`getTopNodesByImportance()`:
- Returns top nodes by importance score
- Optional kind filter
- Ordered by importance, then recency

### Civilization Engine

`ensureDefaultDomainsSeeded()`:
- Seeds default domains: work, family, health, money, pulse, learning, relationships, home

`mapNodeToDomains()`:
- Maps nodes to domains based on:
  - Node kind (deal/project → work)
  - Tags (family/kids → family)
  - Content analysis

`computeDomainStates()`:
- Computes activity_score: sum of memory event weights for domain nodes
- Computes tension_score: conflicts within domain
- Computes health_score: composite of activity vs tension
- Generates summary (placeholder, can be enhanced with LLM)
- Saves snapshot per date

### Civilization Narrator

`getCivilizationSnapshotNarrative()`:
- Fetches latest domain states
- Uses LLM to generate mythic narrative
- Maps scores to metaphors:
  - High activity + high health → "flourishing city"
  - Low activity + low health → "sleepy village needing care"
  - High activity + high tension → "overcrowded, about to riot"
- Returns 3-5 paragraph narrative

---

## API Endpoints

### Graph APIs

#### GET /api/third-brain/graph/top-nodes
Returns top nodes by importance.

**Query params:**
- `kind` (optional): comma-separated list of node kinds
- `limit` (default: 20)

**Response:**
```json
{
  "nodes": [...]
}
```

#### GET /api/third-brain/graph/ego
Returns ego network for a node.

**Query params:**
- `nodeId` (required)
- `depth` (default: 2)
- `limit` (default: 50)

**Response:**
```json
{
  "nodes": [...],
  "edges": [...]
}
```

#### GET /api/third-brain/graph/search
Searches the graph.

**Query params:**
- `q` (required): search query
- `kind` (optional): comma-separated list of node kinds
- `limit` (default: 20)

**Response:**
```json
{
  "nodes": [...],
  "edges": [...]
}
```

### Civilization APIs

#### POST /api/third-brain/civilization/refresh
Refreshes domain states.

**Body:**
```json
{
  "date": "2025-01-20" // optional
}
```

**Response:**
```json
{
  "states": [...]
}
```

#### GET /api/third-brain/civilization/state
Returns domain states.

**Query params:**
- `date` (optional): specific date, otherwise latest per domain

**Response:**
```json
{
  "states": [...]
}
```

#### GET /api/third-brain/civilization/narrative
Returns civilization narrative.

**Response:**
```json
{
  "narrative": "..."
}
```

---

## Integration Points

### From Other Systems → Graph

**Deals/CRM:**
- When deal created/updated → `upsertNodeFromEntity(kind='deal')`
- When contact added → `upsertNodeFromEntity(kind='person')`
- Link deal to contact → `linkNodes(relation='involves')`

**Calendar/Meetings:**
- Create context → `knowledge_contexts(kind='meeting')`
- Link participants → `knowledge_context_links`
- Record event → `recordMemoryEvent(source='calendar')`

**Notes/Journals:**
- Create node → `upsertNodeFromEntity(kind='note')`
- Extract mentions → `linkNodes` to referenced entities
- Record view → `recordMemoryEvent(source='note', action='viewed')`

**Tasks:**
- Create node → `upsertNodeFromEntity(kind='task')`
- Link to project/goal → `linkNodes(relation='part_of')`
- Record completion → `recordMemoryEvent(action='completed')`

### From Graph → Other Systems

**Mythic Intelligence:**
- Use graph to select key nodes as "mythic milestones"
- Use civilization snapshot for coaching context
- Suggest micro-quests tied to under-fed domains

**Boardroom Brain:**
- Attach relevant nodes/edges as decision context
- Highlight knock-on effects via graph
- Show which domains/nodes are impacted by options

**Autopilot / Weekly Planner:**
- Read civilization state for task suggestions
- Show "Civilization Balance" widget
- Suggest weekly missions to rebalance domains

**Master Brain / Evolution Engine:**
- Detect neglected domains (no events for 30+ days)
- Generate improvement ideas
- Test experiments for domain rebalancing

---

## Next Steps

### Frontend UI

#### Third Brain Graph View (`/app/third-brain/page.tsx`)
- **Key Nodes Strip**: Top important nodes by kind
- **Graph Panel**: Force layout or radial visualization
- **Search Bar**: "Search your Third Brain"
- **Node Details Sidebar**: Title, summary, related nodes

#### Memory Civilization View (`/app/third-brain/civilization/page.tsx`)
- **Domain Cards Grid**: Activity, health, tension bars
- **Narrative Card**: Civilization snapshot narrative
- **Drilldown**: Top nodes, recent events, suggested actions

### Enhanced Features
- Vector search for semantic graph queries
- Automatic node extraction from notes/emails
- Graph visualization improvements
- Real-time graph updates
- Civilization state alerts
- Domain rebalancing suggestions

---

## Impact

Pulse now has a **living knowledge graph** that:

1. **Unifies Everything** - People, deals, ideas, goals, events in one graph
2. **Tracks Importance** - Time-decayed importance scores from memory events
3. **Models Relationships** - Rich edge types (supports, conflicts, depends_on, etc.)
4. **Civilization Layer** - Life domains as cities with health/activity/tension
5. **Deep Integration** - Hooks into Mythic, Boardroom, Autopilot, Coaches

This is the moment Pulse becomes a **living civilization of memories** - not just notes and dashboards, but a living, queryable, evolving graph of your life.

🧠🌍✨


