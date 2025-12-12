# Conscious Workspace v1 + Daily Multi-Timeline Execution Layer v1

## Implementation Status

✅ **COMPLETE** - All phases implemented:

### Database Schema
- ✅ 3 tables created:
  - `workspace_focus_states` - Current workspace focus (timeline/branch, mode, tags)
  - `daily_timeline_views` - Per-day, per-timeline projections
  - `workspace_day_log` - Records how the day was actually lived

### Core Modules
- ✅ `lib/workspace/types.ts` - Type definitions
- ✅ `lib/workspace/focus.ts` - Focus manager (set/get workspace focus)
- ✅ `lib/workspace/daily_projection.ts` - Daily timeline projection engine
- ✅ `lib/workspace/day_log.ts` - Workspace day log engine
- ✅ `lib/workspace/multiverse_day.ts` - Daily multiverse quick compare

### API Endpoints
- ✅ `GET/POST /api/workspace/focus` - Get/set workspace focus
- ✅ `POST /api/workspace/day/project` - Generate daily timeline view
- ✅ `GET /api/workspace/day/views` - Get daily views
- ✅ `POST /api/workspace/day/finalize` - Finalize day log
- ✅ `GET /api/workspace/day/log` - Get day log
- ✅ `POST /api/workspace/day/compare` - Compare daily timelines

---

## Overview

**Conscious Workspace v1** is a single main workspace (Life/Work dashboard) that:
- Knows which timeline/branch you're currently "walking"
- Surfaces today's actions in that context
- Shows how today's moves affect timelines, civilization, self-alignment

**Daily Multi-Timeline Execution Layer v1** provides:
- Per-day projections for each timeline/branch
- Quick "day simulation" plus runtime switching
- "Work this day as branch X vs branch Y" capability

---

## Database Schema

### workspace_focus_states
Tracks what the workspace is "focused" on right now:
- active_timeline_id (links to Destiny timeline)
- active_branch_run_id (links to Decision Theater branch)
- focus_mode (normal, deep_work, recovery, sales_push, family, custom)
- focus_tags (extra tags, e.g., ['pipeline','health'])
- applied_at, expires_at

### daily_timeline_views
Per-day, per-timeline (or branch) projections:
- date, timeline_id, branch_run_id
- mode (day_projection, retro, future)
- summary (short "what this day looks like from this path")
- key_metrics (focus_hours, sales_moves, family_time, stress_estimate, etc.)
- suggested_actions ([{id, label, type, linked_task_id, etc.}])

### workspace_day_log
Records how the day was actually lived vs the chosen focus:
- date, chosen_focus_state_id, executed_timeline_id
- summary (daily reflection summary)
- key_signals (completed_focus_blocks, major_deal_moves, family_time_hours, etc.)
- alignment_delta (change in self_alignment from Self Mirror)

---

## Core Functionality

### Focus Manager

`setWorkspaceFocus()`:
- Sets current workspace focus
- If no timeline/branch provided, defaults to current Destiny anchor
- Supports duration (expires_at)
- Returns focus state

`getCurrentWorkspaceFocus()`:
- Returns latest unexpired focus state
- Used to determine current "reality lens"

### Daily Timeline Projection

`generateDailyTimelineView()`:
1. Gets timeline context (waypoints, milestones)
2. Gets calendar events for the day
3. Gets tasks due/overdue
4. Gets deals needing attention
5. Gets Civilization domain state
6. Gets Self Mirror facets
7. Constructs day scenario (available focus hours, etc.)
8. Uses LLM to generate:
   - Summary (1-2 paragraphs)
   - Key metrics (focus_blocks, sales_moves, relationship_moves, health_moves, stress_estimate)
   - Suggested actions (5-10 structured actions)
9. Saves/upserts daily_timeline_view

### Workspace Day Log Engine

`finalizeWorkspaceDay()`:
1. Loads current focus state
2. Aggregates day data:
   - Completed tasks
   - Calendar events
   - Deal updates
   - Emotion state
3. Computes key signals
4. Computes alignment_delta (before/after Self Mirror alignment)
5. Uses LLM to generate summary (3-5 sentences)
6. Saves workspace_day_log
7. Feeds back into other systems:
   - Records self-perception signals
   - Updates civilization domain states (if needed)

### Daily Multiverse Quick Compare

`compareDailyTimelines()`:
- For each timelineId, calls generateDailyTimelineView
- Returns array of views for comparison
- Used to show "If you lived today as X vs Y vs Z"

---

## API Endpoints

### Workspace Focus

#### GET /api/workspace/focus
Returns current workspace focus.

**Response:**
```json
{
  "focus": {...}
}
```

#### POST /api/workspace/focus
Sets workspace focus.

**Body:**
```json
{
  "activeTimelineId": "optional-uuid",
  "activeBranchRunId": "optional-uuid",
  "focusMode": "deep_work",
  "focusTags": ["pipeline","pulse"],
  "durationHours": 4
}
```

**Response:**
```json
{
  "focus": {...}
}
```

### Daily Timeline Views

#### POST /api/workspace/day/project
Generates daily timeline view.

**Body:**
```json
{
  "date": "2025-12-11",
  "timelineId": "optional-uuid",
  "branchRunId": "optional-uuid"
}
```

**Response:**
```json
{
  "view": {...}
}
```

#### GET /api/workspace/day/views
Gets daily views.

**Query params:**
- `date` (default: today)
- `timelineIds` (comma-separated, optional)
- `branchRunIds` (comma-separated, optional)

**Response:**
```json
{
  "views": [...]
}
```

### Day Log

#### POST /api/workspace/day/finalize
Finalizes day log.

**Body:**
```json
{
  "date": "2025-12-11",
  "summary": "optional manual reflection text"
}
```

**Response:**
```json
{
  "dayLog": {...}
}
```

#### GET /api/workspace/day/log
Gets day log.

**Query params:**
- `date` (default: today)

**Response:**
```json
{
  "dayLog": {...}
}
```

### Daily Multiverse Compare

#### POST /api/workspace/day/compare
Compares daily timelines.

**Body:**
```json
{
  "date": "2025-12-11",
  "timelineIds": ["uuid1","uuid2"]
}
```

**Response:**
```json
{
  "views": [...]
}
```

---

## Integration Points

### With Destiny Engine
- Default workspace focus uses current Destiny Anchor
- Changing focus to another timeline doesn't change anchor automatically (v1)
- Day logs can be used by Destiny Engine weekly to re-evaluate scoring & anchor suggestions

### With Decision Theater
- Branch runs can feed the workspace
- If a branch is "tentatively favored" in Decision Theater, suggest "Test-drive this branch for a week"
- Sets activeBranchRunId & related activeTimelineId

### With Life Simulation
- Daily Timeline Views can optionally use micro Life Simulation runs
- "Given current context & focus mode, how should this day look numerically?"

### With Self Mirror & Civilization
- workspace_day_log feeds into:
  - self_perception_signals (supports/violates identity)
  - civilization_domain_state (per-domain activity/health)
- Self Mirror sessions can say: "Over the last 14 days, your day logs show you mostly living like Timeline X"

### With Autopilot & Weekly Planner
- Weekly Planner uses daily_timeline_views & workspace_focus_states to propose "Suggested focus modes for M–F"
- Autopilot when generating tasks tags them with timelineId, domain, and optionally branchRunId
- Conscious Workspace uses these tags to order tasks for the day

### With Master Brain
- Diagnostics checks:
  - Destiny/Decision Theater are used but workspace focus is never set
  - Or day logs are missing for many days
- Evolution Engine suggests UX tweaks to bring Conscious Workspace front-and-center

---

## Next Steps

### Frontend UI

#### Conscious Workspace (`/app/workspace/page.tsx` or upgrade `/app/life/page.tsx`)
- **Top Strip (Conscious Banner)**: Current focus mode, anchored timeline, branch, "Change Focus" button
- **Section 1 - Today's Path**: Card showing "Today if you live as [Timeline X]" with summary, metrics, "Switch to This Path" button, toggle for alternative timelines
- **Section 2 - Today's Actions**: Prioritized stack (Destiny Moves, Boardroom/Strategic Moves, Civilization Balance Moves, Maintenance/Admin)
- **Section 3 - Conscious Check-Ins**: Mood/Energy slider, Self-Alignment nudge, Timeline Drift detection
- **Section 4 - End-of-Day Flow**: "End Day" button, day reflection summary, option to send insights to Self Mirror

#### Focus Switcher Component
- Modal/slide-over with:
  - Current anchored timeline
  - Other timelines (cards)
  - Last few branch options from Decision Theater
  - Predefined focus modes (Normal/Deep Work/Sales Push/Family/Recovery)
- Single click sets activeTimelineId, activeBranchRunId, focusMode

---

## Impact

Pulse now has:

1. **Conscious Workspace** - Single main workspace that knows which timeline you're walking
2. **Daily Timeline Projections** - Per-day views for each timeline/branch
3. **Focus Management** - Set/get current workspace focus with modes and tags
4. **Day Logging** - Records how the day was actually lived vs chosen focus
5. **Daily Multiverse Compare** - Compare "what if" scenarios for the day
6. **Deep Integration** - Wired into Destiny, Decision Theater, Self Mirror, Civilization, Planner, Autopilot

This is the moment Pulse transforms from "A powerful backend of engines" into **"A living cockpit where each day is a conscious move in a specific future timeline."**

🧠🌌✨


