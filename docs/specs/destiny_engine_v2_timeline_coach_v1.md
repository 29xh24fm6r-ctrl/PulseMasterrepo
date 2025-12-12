# Destiny Engine v2 + Timeline Coach v1

## Implementation Status

✅ **COMPLETE** - All phases implemented:

### Database Schema
- ✅ 7 tables created:
  - `destiny_timelines` - Future paths/scenarios
  - `destiny_waypoints` - Key markers along timelines
  - `destiny_milestones` - Granular milestones
  - `destiny_timeline_scores` - Rolling scores for timelines
  - `destiny_simulation_runs` - Links to simulation results
  - `timeline_coach_sessions` - Coach sessions
  - `destiny_anchor_choices` - Current chosen timeline

### Core Modules
- ✅ `lib/destiny/types.ts` - Type definitions
- ✅ `lib/destiny/builder.ts` - Timeline creation (from objectives, custom)
- ✅ `lib/destiny/scoring.ts` - Timeline scoring engine
- ✅ `lib/destiny/anchor.ts` - Anchor management
- ✅ `lib/timeline/coach.ts` - Timeline coach engine

### API Endpoints
- ✅ `POST /api/destiny/timelines/from-objective` - Create timeline from objective
- ✅ `GET/POST /api/destiny/timelines` - List/create timelines
- ✅ `GET /api/destiny/timelines/[id]` - Timeline details
- ✅ `POST /api/destiny/timelines/[id]/waypoints/default` - Generate waypoints
- ✅ `POST /api/destiny/refresh-scores` - Refresh timeline scores
- ✅ `GET/POST /api/destiny/anchor` - Get/set anchor
- ✅ `POST /api/timeline-coach/session` - Run coach session
- ✅ `GET /api/timeline-coach/sessions` - List sessions

---

## Overview

**Destiny Engine v2** represents possible futures as Timelines (paths, waypoints, and milestones), tied to real goals, projects, and strategic objectives, with probability/feasibility/alignment tracking.

**Timeline Coach v1** is a dedicated coach that understands timelines, helps compare futures, and gives next actions that move you toward the chosen future.

---

## Database Schema

### destiny_timelines
A "timeline" = a coherent future path (scenario):
- key: optional short key (e.g., 'stay_in_bank', 'go_all_in_pulse')
- name, description
- time_horizon_years (e.g., 1.0, 3.0, 5.0, 10.0)
- archetype, mythic_frame
- primary_domains (work, family, money, health, pulse)
- is_active

### destiny_waypoints
Key "markers" along a timeline:
- ordering (1, 2, 3, ...)
- name, description
- target_date
- related_node_id (links to Third Brain)
- strategic_objective_id (links to Boardroom)

### destiny_milestones
More granular milestones inside waypoints:
- name, description
- target_date
- status (pending, in_progress, achieved, abandoned)

### destiny_timeline_scores
Rolling scores for each timeline:
- feasibility_score (0-10): based on resources, trends
- alignment_score (0-10): with Identity/Self Mirror
- risk_score (0-10): higher = riskier
- emotional_fit_score (0-10): matches emotional patterns/preferences
- simulation_summary (JSON): results from Life Simulation
- narrative_summary: short LLM summary

### timeline_coach_sessions
Sessions with Timeline Coach:
- mode: compare_paths, refine_path, next_steps, crisis_repath
- question, response, summary
- recommendations: [{timeline_id, kind, action}]
- followup_actions: autopilot/planner ready

### destiny_anchor_choices
Records "anchor" choices: which timeline is currently chosen/favored:
- timeline_id
- strength: soft (exploring) | firm (committed)
- notes

---

## Core Functionality

### Timeline Builder

`createTimelineFromObjective()`:
- Pulls strategic_objectives (Boardroom)
- Infers time_horizon_years from objective timeframe
- Infers primary_domains from objective content
- Creates timeline
- Optionally auto-generates default waypoints

`createCustomTimeline()`:
- Creates custom timeline with user-specified parameters
- Supports archetype, mythic_frame, primary_domains

`generateDefaultWaypointsForTimeline()`:
- Uses LLM to generate 3-7 waypoints
- Considers:
  - Timeline description
  - Related strategic objectives
  - Third Brain graph nodes
  - Time horizon
- Calculates target dates based on ordering

### Timeline Scoring

`refreshTimelineScores()`:
1. Gets all active timelines
2. Loads Self Mirror snapshot & facets
3. Loads Civilization domain states
4. For each timeline:
   - Builds parameters (horizon, domains, archetype)
   - Gets waypoints for context
   - Calls Life Simulation (placeholder)
   - Uses LLM to compute scores:
     - Feasibility (0-10)
     - Alignment (0-10)
     - Risk (0-10)
     - Emotional Fit (0-10)
   - Generates narrative summary
   - Saves score

### Anchor Manager

`setDestinyAnchor()`:
- Sets a timeline as the current anchor
- Supports strength: soft (exploring) or firm (committed)
- Optional notes

`getCurrentDestinyAnchor()`:
- Returns the latest chosen timeline
- Most recent anchor choice

### Timeline Coach

`runTimelineCoachSession()`:
1. Loads active timelines
2. Selects 2-4 most relevant (if not provided):
   - High feasibility OR high tension OR actively anchored
3. Gets latest scores, waypoints for selected timelines
4. Loads Self Mirror context (snapshot, facets)
5. Loads Mythic profile (chapter, archetypes)
6. Loads Civilization domain states
7. Builds LLM prompt with full context
8. Generates response based on mode:
   - compare_paths: Pros/cons, strengths/weaknesses, best path
   - refine_path: Suggestions to tweak waypoints/horizons
   - next_steps: 3-7 concrete actions for anchored timeline
   - crisis_repath: Reframing + alternative micro-timelines
9. Returns session with:
   - response
   - summary
   - recommendations
   - followup_actions

---

## API Endpoints

### Destiny Engine APIs

#### POST /api/destiny/timelines/from-objective
Creates timeline from strategic objective.

**Body:**
```json
{
  "objectiveId": "uuid",
  "baseKey": "optional-key"
}
```

**Response:**
```json
{
  "timeline": {...}
}
```

#### GET /api/destiny/timelines
Lists user's active timelines with latest scores.

**Response:**
```json
{
  "timelines": [
    {
      ...timeline,
      "latest_score": {...}
    }
  ]
}
```

#### POST /api/destiny/timelines
Creates custom timeline.

**Body:**
```json
{
  "name": "Example Timeline",
  "description": "...",
  "timeHorizonYears": 5,
  "primaryDomains": ["work", "family", "money"],
  "archetype": "builder",
  "mythicFrame": "warrior_king"
}
```

**Response:**
```json
{
  "timeline": {...}
}
```

#### GET /api/destiny/timelines/[id]
Timeline details + waypoints + milestones + score history.

**Response:**
```json
{
  "timeline": {...},
  "waypoints": [
    {
      ...waypoint,
      "milestones": [...]
    }
  ],
  "scores": [...]
}
```

#### POST /api/destiny/timelines/[id]/waypoints/default
Generates default waypoints for timeline.

**Response:**
```json
{
  "waypoints": [...]
}
```

#### POST /api/destiny/refresh-scores
Refreshes timeline scores for user.

**Response:**
```json
{
  "scores": [...]
}
```

#### POST /api/destiny/anchor
Sets destiny anchor.

**Body:**
```json
{
  "timelineId": "uuid",
  "strength": "firm",
  "notes": "Going all-in on this path."
}
```

**Response:**
```json
{
  "success": true
}
```

#### GET /api/destiny/anchor
Returns current anchored timeline.

**Response:**
```json
{
  "anchor": {...}
}
```

### Timeline Coach APIs

#### POST /api/timeline-coach/session
Runs timeline coach session.

**Body:**
```json
{
  "mode": "compare_paths",
  "question": "Should I stay at my bank for 3–5 years or go all-in on Pulse?",
  "timelineIds": ["uuid1", "uuid2"]
}
```

**Response:**
```json
{
  "sessionId": "uuid",
  "response": "...",
  "summary": "...",
  "recommendations": [...],
  "followupActions": [...]
}
```

#### GET /api/timeline-coach/sessions
Lists recent coach sessions.

**Response:**
```json
{
  "sessions": [...]
}
```

---

## Integration Points

### Boardroom Brain
- When creating major decisions, optionally create 2+ timelines representing each path
- Decision Theater can show each option as a timeline with sim scores and narrative
- Executive Council personas can consult timeline data to vote

### Life Simulation Engine
- Destiny Engine's `refreshTimelineScores` calls Life Simulation
- Simulation mode: `timeline_projection` uses domain emphasis and planned decisions

### Mythic Intelligence
- Each timeline can have archetype + mythic_frame
- Mythic Story Sessions can tell the story of Timeline X for next 5 years
- Mythic Coach uses anchored timeline to frame day-to-day advice

### Self Mirror
- Destiny Engine uses Self Mirror to compute alignment_score
- Mirror Sessions can surface: "You're living as if Timeline A is your future, but your stated desire is Timeline B"

### Third Brain Graph & Civilization
- Waypoints/milestones tie to Third Brain nodes (projects, deals, goals)
- Civilization domains map timelines to domain investment over time
- Timeline Coach may say: "In this path, Work city booms and Health town becomes a ghost town unless you change X"

### Weekly Planner & Autopilot
- When timeline is anchored:
  - Weekly Planner pulls next upcoming waypoints/milestones
  - Surfaces "Destiny Moves" section (2-5 path-critical actions per week)
- Autopilot uses followup_actions from Timeline Coach sessions to create tasks, schedule blocks, trigger emails

### Master Brain / Evolution
- Diagnostics can flag: "Destiny Engine exists but you have 0 active timelines" → improvement idea
- Experiments around different views for Destiny Hub, reminders to re-evaluate anchored timeline

---

## Next Steps

### Frontend UI

#### Destiny Hub (`/app/destiny/page.tsx`)
- **Header**: Title, current anchored timeline pill
- **Timeline Cards**: Each timeline with mini bar chart (Feasibility/Alignment/Risk/Emotional Fit), tags, actions
- **Compare Paths**: Multi-select + "Ask Timeline Coach to Compare"
- **Create New Timeline**: "From Strategic Objective" or "Custom Future Path"

#### Timeline Detail View (`/app/destiny/timelines/[id]/page.tsx`)
- **Top Summary**: Name, description, horizon, archetype, latest scores (radar chart)
- **Waypoints Timeline**: Rail of waypoints in order, expandable milestones
- **Sim & Narrative Panel**: Latest narrative_summary, re-run scoring button
- **Actions**: "Ask Timeline Coach", "Set as Anchor", "Send to Boardroom"

#### Timeline Coach View (`/app/timeline-coach/page.tsx`)
- **Left Panel**: Timelines list with checkboxes
- **Main Panel**: Textarea, mode selector, conversation display
- **Right Panel**: Self Mirror snapshot, Mythic chapter, Civilization summary

---

## Impact

Pulse now has:

1. **Destiny Engine v2** - Multi-timeline futures with waypoints and milestones
2. **Timeline Scoring** - Feasibility, alignment, risk, emotional fit scores
3. **Anchor Management** - Track which timeline is current focus
4. **Timeline Coach** - Dedicated coach for future paths
5. **Deep Integration** - Wired into Boardroom, Mythic, Self Mirror, Civilization, Planner, Autopilot

This is the moment Pulse becomes a **future navigation system** - not just tracking your life, but actively helping you navigate multiple possible futures and choose the path that aligns with who you are.

🧭🌌✨


