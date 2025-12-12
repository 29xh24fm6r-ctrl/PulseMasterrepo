# Global Sense of Self Mirror v1 + Creative Cortex v2

## Implementation Status

✅ **COMPLETE** - All phases implemented:

### Database Schema
- ✅ 8 tables created:
  - Self Mirror: `self_identity_snapshots`, `self_perception_signals`, `self_mirror_facets`, `self_mirror_sessions`
  - Creative Cortex: `creative_projects`, `creative_sessions`, `creative_assets`, `creative_style_profiles`

### Core Modules
- ✅ Self Mirror:
  - `lib/selfmirror/types.ts` - Type definitions
  - `lib/selfmirror/signals.ts` - Signal aggregator
  - `lib/selfmirror/snapshots.ts` - Snapshot engine
  - `lib/selfmirror/facets.ts` - Facet engine
  - `lib/selfmirror/sessions.ts` - Mirror session engine
- ✅ Creative Cortex:
  - `lib/creative/types.ts` - Type definitions
  - `lib/creative/style.ts` - Style profiles
  - `lib/creative/projects.ts` - Project manager
  - `lib/creative/engine.ts` - Creative engine
  - `lib/creative/remix.ts` - Remix module

### API Endpoints
- ✅ Self Mirror:
  - `POST /api/self-mirror/snapshot` - Build snapshot + facets
  - `POST /api/self-mirror/session/start` - Start mirror session
  - `GET /api/self-mirror/facets` - Get facets
- ✅ Creative Cortex:
  - `GET/POST /api/creative/projects` - List/create projects
  - `GET /api/creative/projects/[id]` - Project details
  - `POST /api/creative/session/run` - Run creative session
  - `POST /api/creative/asset/remix` - Remix asset

---

## Overview

**Global Sense of Self Mirror v1** provides a structured representation of:
- Who the user believes they are (Identity Engine)
- How they act (behavioral signals)
- How their "life civilization" is running (Civilization domains)
- Where gaps and growth edges are (facets)

**Creative Cortex v2** is a generative engine that:
- Uses Third Brain graph, Mythic arcs, and Self Mirror
- Helps with creative work (writing, strategy, product ideas, content, problem solving)
- Remembers creative projects and sessions

---

## Database Schema

### Self Mirror Tables

#### self_identity_snapshots
Periodic "state of identity" snapshots:
- roles, values, strengths, vulnerabilities
- self_story (LLM-generated narrative)
- mythic_archetypes, domain_balance
- overall_self_alignment (0-10)

#### self_perception_signals
Behavioral signals feeding the mirror:
- source: calendar, tasks, deals, habits, relationships, finance, emotion_os, civilization
- category: followthrough, overload, avoidance, risk_taking, caregiving, learning, etc.
- direction: supports_identity, conflicts_identity, neutral
- weight, description, occurred_at

#### self_mirror_facets
Key mirror facets tracked over time:
- self_alignment, work_life_balance, relationships_nourishment
- health_attention, creative_expression, financial_groundedness
- score (0-100), trend (up/down/flat/unknown)

#### self_mirror_sessions
Individual mirror sessions:
- mode: daily_glance, weekly_debrief, identity_deep_dive, crucible_review
- summary, insights, followup_actions
- snapshot_id (links to snapshot)

### Creative Cortex Tables

#### creative_projects
Longer-lived creative efforts:
- title, description, kind (writing, product, strategy, content, design, other)
- status (active, paused, completed, archived)
- related_node_id (links to Third Brain graph)
- tags

#### creative_sessions
Individual creative work sessions:
- mode: brainstorm, drafting, refinement, problem_solving, ideation
- prompt, context_summary, output_summary
- created_assets (JSON array)

#### creative_assets
Outputs from Creative Cortex:
- kind: text, outline, plan, idea_list, prompt, spec, story, email, slide_bullets, tweet_thread
- content (main text)
- metadata (format hints, length, usage)
- related_node_id (links to Third Brain graph)

#### creative_style_profiles
User's creative style/voice profiles:
- name, description, tone
- constraints (e.g., 'avoid fluff', 'max 2 levels of bullets')
- examples (short text samples)
- is_default

---

## Core Functionality

### Self Mirror

#### Signal Aggregator

`recordSelfPerceptionSignal()`:
- Records a behavioral signal
- Links to source system
- Categorizes and weights

`ingestSignalsFromSystems()`:
- Pulls from tasks (followthrough)
- Calendar (overload)
- Emotion OS (replenishment)
- Civilization domains (balance)
- Finance (risk_taking)
- Converts into perception signals

#### Snapshot Engine

`buildSelfIdentitySnapshot()`:
1. Ingests latest signals
2. Loads Identity Engine data (roles, values, strengths, vulnerabilities)
3. Loads Mythic data (archetypes)
4. Loads Civilization domain state
5. Aggregates perception signals (last 30 days)
6. Computes overall_self_alignment (0-10)
7. Uses LLM to generate self_story
8. Saves snapshot

#### Facet Engine

`recomputeSelfMirrorFacets()`:
- Computes 6 key facets:
  - self_alignment (from snapshot)
  - work_life_balance (from civilization domains)
  - relationships_nourishment (from signals + domains)
  - health_attention (from civilization domains)
  - creative_expression (from creative projects)
  - financial_groundedness (from finance signals)
- Computes scores (0-100) and trends (up/down/flat)
- Updates facets table

#### Mirror Session Engine

`startSelfMirrorSession()`:
1. Ensures latest snapshot & facets
2. Gets Emotion OS patterns
3. Gets Civilization summary
4. Builds LLM prompt with context
5. Generates:
   - Summary (2-5 paragraphs)
   - Insights (structured)
   - Reflection questions (3-7)
   - Micro-adjustments (2-4)
6. Saves session

### Creative Cortex

#### Style Profiles

`getCreativeStyleProfiles()`:
- Lists all style profiles for user
- Ordered by is_default

`getDefaultStyleProfile()`:
- Returns default profile

`upsertCreativeStyleProfile()`:
- Creates/updates profile
- Handles default flag (unsets others)

#### Project Manager

`createCreativeProject()`:
- Creates new project
- Links to Third Brain node (optional)
- Tags support

`listCreativeProjects()`:
- Lists all user projects
- Ordered by updated_at

`getCreativeProject()`:
- Gets project details
- Includes sessions and assets

#### Creative Engine

`runCreativeSession()`:
1. Gets project context (if projectId)
2. Gets Third Brain graph context (ego network)
3. Gets Self Mirror context (roles, values, strengths)
4. Gets style profile
5. Builds context summary
6. Generates creative output via LLM
7. Creates session record
8. Creates primary asset
9. Returns session + assets

#### Remix Module

`remixCreativeAsset()`:
1. Gets original asset
2. Gets style profile
3. Determines target format instructions
4. Generates remix via LLM
5. Creates new asset with metadata linking to original

---

## API Endpoints

### Self Mirror APIs

#### POST /api/self-mirror/snapshot
Builds new snapshot and recomputes facets.

**Body:**
```json
{
  "source": "system" // optional
}
```

**Response:**
```json
{
  "snapshot": {...},
  "facets": [...]
}
```

#### POST /api/self-mirror/session/start
Starts a mirror session.

**Body:**
```json
{
  "mode": "weekly_debrief" // daily_glance, weekly_debrief, identity_deep_dive, crucible_review
}
```

**Response:**
```json
{
  "session": {
    "summary": "...",
    "insights": [...],
    "followup_actions": [...]
  }
}
```

#### GET /api/self-mirror/facets
Returns current facets.

**Response:**
```json
{
  "facets": [...]
}
```

### Creative Cortex APIs

#### GET /api/creative/projects
Lists user projects.

**Response:**
```json
{
  "projects": [...]
}
```

#### POST /api/creative/projects
Creates new project.

**Body:**
```json
{
  "title": "Pulse OS investor deck",
  "description": "Core pitch and architecture overview",
  "kind": "product",
  "relatedNodeId": "optional-uuid",
  "tags": ["investor", "pitch"]
}
```

**Response:**
```json
{
  "project": {...}
}
```

#### GET /api/creative/projects/[id]
Gets project details with sessions and assets.

**Response:**
```json
{
  "project": {...},
  "sessions": [...],
  "assets": [...]
}
```

#### POST /api/creative/session/run
Runs a creative session.

**Body:**
```json
{
  "projectId": "optional-uuid",
  "mode": "brainstorm",
  "prompt": "Generate 10 bold taglines for Pulse OS.",
  "styleProfileId": "optional-uuid"
}
```

**Response:**
```json
{
  "session": {...},
  "primaryAsset": {...},
  "allAssets": [...]
}
```

#### POST /api/creative/asset/remix
Remixes an asset into a new format.

**Body:**
```json
{
  "assetId": "uuid",
  "targetKind": "slide_bullets",
  "styleProfileId": "optional-uuid"
}
```

**Response:**
```json
{
  "asset": {...}
}
```

---

## Integration Points

### Self Mirror Integrations

**With Mythic Intelligence:**
- Snapshot uses Mythic archetypes + chapter
- Mythic Coach uses facets to shape advice
- Low self_alignment → more gentle, restorative tone
- Low creative_expression → more creative missions

**With Boardroom Brain:**
- Shows alignment between decision and Self Mirror
- "This move matches your values" vs "This conflicts with your stated role as X"
- Executive Council Future Self persona uses snapshot

**With Third Brain & Civilization:**
- Uses Civilization domain scores for balance assessment
- Over/under investment across life areas
- Links to knowledge nodes

**With Autopilot & Weekly Planner:**
- followup_actions become Weekly Planner missions
- Autopilot suggestions (schedule time blocks)

### Creative Cortex Integrations

**With Third Brain Graph:**
- Projects can be tied to knowledge_nodes
- Pulls ego network context automatically
- Creates nodes for important assets

**With Self Mirror:**
- Uses roles, values, preferences to align tone
- Respects identity in creative output

**With Mythic Intelligence:**
- Uses archetype + chapter for mythic flavor
- Story-driven creative sessions

**With Civilization:**
- Domain context for project (work, family, etc.)
- Balances creative expression across domains

**With Autopilot & Weekly Planner:**
- Converts creative outputs (plans, outlines) into tasks
- Strategic objectives for Boardroom Brain

---

## Next Steps

### Frontend UI

#### Self Mirror View (`/app/self-mirror/page.tsx`)
- **Header**: Alignment score, top facets with mini bars
- **Snapshot Card**: Roles, values, strengths, Mythic archetype, Civilization summary
- **Facets Grid**: Cards for each facet (score bar, trend indicator, short sentence)
- **Session Launcher**: Buttons for different modes, displays summary + prompts + actions

#### Creative Cortex Studio (`/app/creative/page.tsx`)
- **Header**: Title, "New Project", "Quick Session"
- **Active Projects**: Cards with title, kind, status, last worked on, quick actions
- **Quick Creative Session**: Textarea, mode dropdown, style profile dropdown, "Run Session" button
- **Recent Assets**: List with title, kind, project, actions (Open, Remix)

---

## Impact

Pulse now has:

1. **Global Self Mirror** - Structured representation of who you are and how you're living
2. **Behavioral Signals** - Automatic ingestion from all systems
3. **Identity Snapshots** - Periodic LLM-generated self-story
4. **Mirror Facets** - Key metrics (alignment, balance, nourishment, etc.)
5. **Mirror Sessions** - Reflective, kind analysis + prompts
6. **Creative Cortex** - Generative engine with full context
7. **Style Profiles** - Reusable creative voice presets
8. **Project Memory** - Tracks creative projects and sessions
9. **Remix Capability** - Transform assets into new formats

This is the moment Pulse becomes your **living mirror** *and* your **idea factory** - not just tracking your life, but helping you see yourself clearly and create powerfully.

🪞🎨✨


