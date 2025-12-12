# Decision Theater v2 + Multi-Timeline Simulation Layer v1

## Implementation Status

✅ **COMPLETE** - All phases implemented:

### Database Schema
- ✅ 5 tables created:
  - `decision_trees` - Trees for decisions
  - `decision_tree_nodes` - Nodes in the tree (choice points)
  - `decision_tree_edges` - Edges between nodes (branches)
  - `branch_simulation_runs` - Simulation runs along paths
  - `branch_comparisons` - Comparisons between branches

### Core Modules
- ✅ `lib/boardroom/theater_v2/types.ts` - Type definitions
- ✅ `lib/boardroom/theater_v2/builder.ts` - Tree creation and editing
- ✅ `lib/boardroom/theater_v2/paths.ts` - Path extraction
- ✅ `lib/simulation/multitimeline.ts` - Multi-timeline simulation layer
- ✅ `lib/boardroom/theater_v2/compare.ts` - Branch comparison engine

### API Endpoints
- ✅ `GET/POST /api/boardroom/decisions/[decisionId]/tree` - Get/create tree
- ✅ `POST /api/boardroom/decision-trees/[treeId]/nodes` - Create node
- ✅ `POST /api/boardroom/decision-trees/[treeId]/edges` - Create edge
- ✅ `GET /api/boardroom/decision-trees/[treeId]` - Tree details
- ✅ `POST /api/boardroom/decision-trees/[treeId]/simulate` - Run simulations
- ✅ `POST /api/boardroom/decision-trees/[treeId]/compare` - Compare branches

---

## Overview

**Decision Theater v2** is not just "Option A vs B" but a **branching decision tree** with nodes = key decisions and edges = outcomes/pivots. Each branch gets simulation + narrative.

**Multi-Timeline Simulation Layer** glues together Boardroom decisions, Destiny timelines, and Life Simulation to run simulations along whole paths, not just single choices.

---

## Database Schema

### decision_trees
Each decision can have a tree of branches:
- decision_id (links to Boardroom decision)
- name, description
- created_at, updated_at

### decision_tree_nodes
Nodes in the decision tree (choice points or outcome checkpoints):
- parent_node_id (null for root)
- depth (root = 0)
- label, description
- related_decision_option_id (links to Boardroom option)
- related_timeline_id (links to Destiny timeline)
- pivot_at_date (when this node's choice/change happens)

### decision_tree_edges
Edges from one node to another (branches):
- from_node_id, to_node_id
- label, description

### branch_simulation_runs
Simulation runs along a path through the tree:
- root_node_id, leaf_node_id
- path_node_ids (ordered root → leaf)
- parameters (combined knobs)
- results (numeric outcomes)
- narrative_summary (LLM-generated)
- scores (risk, upside, downside, regret_risk, etc.)

### branch_comparisons
Comparison snapshots between multiple branches:
- compared_run_ids (which runs were compared)
- summary, recommendation
- key_differences (structured JSON)

---

## Core Functionality

### Tree Builder

`createDecisionTreeForDecision()`:
- Creates tree for a decision
- Auto-creates root node "Now"
- Returns tree

`addNodeToTree()`:
- Adds node to tree
- Determines depth from parent
- Links to decision option or timeline
- Sets pivot date

`connectNodes()`:
- Creates edge between nodes
- Prevents self-loops
- Prevents duplicates

`createTwoStageTreeFromTimelines()`:
- Helper to create common pattern
- Root: "Today"
- Children: "Commit to Timeline A" vs "Commit to Timeline B"
- Grandchildren: Pivot nodes at 18 and 36 months

### Path Extraction

`getTreePaths()`:
- BFS/DFS to find all root→leaf paths
- Respects maxDepth and maxPaths limits
- Avoids cycles
- Returns array of paths with node IDs

### Multi-Timeline Simulation Layer

`runBranchSimulations()`:
1. Gets all paths from tree
2. For each path:
   - Collects nodes in path
   - Builds simulation stages:
     - Each stage has timelineId, startOffsetMonths, endOffsetMonths
     - Calculates duration from pivot dates
   - Builds parameters
   - Calls Life Simulation (placeholder)
   - Computes scores (risk, upside, downside, regret_risk, resilience, alignment)
   - Generates narrative summary via LLM
   - Saves branch_simulation_run

### Branch Comparison Engine

`compareBranches()`:
1. Loads relevant simulation runs
2. Gets node labels for context
3. Builds comparison context
4. Uses LLM to generate:
   - Summary (high-level comparison)
   - Recommendation (which path fits best)
   - Key differences (structured JSON)
5. Saves branch_comparison

---

## API Endpoints

### Tree Management

#### GET /api/boardroom/decisions/[decisionId]/tree
Gets tree for a decision (if exists).

**Response:**
```json
{
  "tree": {...},
  "nodes": [...],
  "edges": [...],
  "simulations": [...],
  "latest_comparison": {...}
}
```

#### POST /api/boardroom/decisions/[decisionId]/tree
Creates new tree for a decision.

**Body:**
```json
{
  "name": "Multi-stage Quit vs Stay",
  "description": "Explore pivot timings"
}
```

**Response:**
```json
{
  "tree": {...}
}
```

#### POST /api/boardroom/decision-trees/[treeId]/nodes
Creates node.

**Body:**
```json
{
  "parentNodeId": "optional-uuid",
  "label": "Commit to Timeline A now",
  "description": "Stay in bank role 3–5 years",
  "relatedDecisionOptionId": "optional",
  "relatedTimelineId": "optional",
  "pivotAtDate": "2028-01-01"
}
```

**Response:**
```json
{
  "node": {...}
}
```

#### POST /api/boardroom/decision-trees/[treeId]/edges
Creates edge.

**Body:**
```json
{
  "fromNodeId": "uuid",
  "toNodeId": "uuid",
  "label": "Pivot at 18 months"
}
```

**Response:**
```json
{
  "edge": {...}
}
```

#### GET /api/boardroom/decision-trees/[treeId]
Returns tree metadata, nodes, edges, plus latest simulations & comparisons.

**Response:**
```json
{
  "tree": {...},
  "nodes": [...],
  "edges": [...],
  "simulations": [...],
  "latest_comparison": {...}
}
```

### Multi-Timeline Simulations

#### POST /api/boardroom/decision-trees/[treeId]/simulate
Runs branch simulations.

**Body:**
```json
{
  "maxPaths": 10
}
```

**Response:**
```json
{
  "runs": [...]
}
```

#### POST /api/boardroom/decision-trees/[treeId]/compare
Compares branches.

**Body:**
```json
{
  "runIds": ["uuid1", "uuid2"]
}
```

**Response:**
```json
{
  "comparison": {...}
}
```

---

## Integration Points

### With Destiny Engine v2
- Nodes ↔ Timelines via `related_timeline_id`
- After choosing a branch, suggest setting final timeline as Destiny Anchor
- Each segment of a branch uses Destiny timeline "energy"

### With Life Simulation Engine
- Multi-Timeline Simulation Layer calls Life Simulation with staged inputs
- Mode: `multi_stage` with stages array
- Each stage has timelineId, startOffsetMonths, endOffsetMonths

### With Timeline Coach
- Button: "Discuss These Branches with Timeline Coach"
- Calls `/api/timeline-coach/session` in `compare_paths` mode
- Passes subset of paths & their simulation runs

### With Self Mirror & Civilization
- Branch scoring includes alignment & civilization impacts
- Shows which branch leads to burnout vs healthy balance
- Shows overbuilt Work city vs nourished Family/Health towns
- Theater UI can show per-branch icons

### With Autopilot & Weekly Planner
- Once a branch (or its underlying timeline) is chosen:
  - Autopilot turns key waypoints/milestones into tasks and sequences
  - Weekly Planner shows "This week's moves for the chosen branch"

### With Master Brain
- Diagnostics can check:
  - Decisions with high importance but no tree created
  - Or no simulations run
- Generates improvement ideas:
  - "Enable multi-timeline view for your top 3 decisions this month"

---

## Next Steps

### Frontend UI

#### Decision Theater v2 View (`/app/boardroom/decisions/[id]/theater`)
- **Top Bar**: Decision title, buttons (Add/Edit Paths, Run Simulation, Compare Branches, Send to Timeline Coach)
- **Left Panel**: Tree Editor/Viewer (node graph, controls for adding nodes/edges)
- **Right Panel**: Branch Results (Branches List, Compare Branches, Narrative View)

### Enhanced Features
- Full Life Simulation integration
- Interactive tree visualization (D3.js or similar)
- Real-time simulation updates
- Branch recommendation engine
- Timeline anchor integration
- Weekly Planner integration

---

## Impact

Pulse now has:

1. **Decision Theater v2** - Branching decision trees with nodes and edges
2. **Multi-Timeline Simulation Layer** - Runs simulations along whole paths
3. **Path Extraction** - Enumerates all root→leaf paths
4. **Branch Comparison** - LLM-powered comparison and recommendations
5. **Deep Integration** - Wired into Destiny, Life Simulation, Timeline Coach, Self Mirror, Civilization, Planner, Autopilot

This is the moment Pulse becomes a **time-branch simulator** - not just comparing options, but simulating entire branching futures and helping you navigate the multiverse of possibilities.

🎭🌌✨


