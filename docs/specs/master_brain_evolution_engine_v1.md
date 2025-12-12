# Master Brain Evolution Engine v1 - Self-Improvement & Evolution

## Implementation Status

✅ **COMPLETE** - All phases implemented:

### Database Schema
- ✅ 5 tables created:
  - system_improvement_ideas (improvement ideas from diagnostics/feedback)
  - system_experiments (experiments testing ideas)
  - system_experiment_runs (concrete experiment runs/phases)
  - system_changelog (visible system changes)
  - system_user_feedback (user feedback linked to modules)

### Core Modules
- ✅ `lib/masterbrain/evolution/types.ts` - Type definitions
- ✅ `lib/masterbrain/evolution/ideas.ts` - Idea generator
- ✅ `lib/masterbrain/evolution/suggestions.ts` - Suggestion engine
- ✅ `lib/masterbrain/evolution/experiments.ts` - Experiment engine
- ✅ `lib/masterbrain/evolution/changelog.ts` - Changelog engine
- ✅ `lib/masterbrain/evolution/narrator.ts` - Upgrade narrator

### API Endpoints
- ✅ `POST /api/masterbrain/evolution/ideas/from-diagnostics` - Generate ideas from diagnostics
- ✅ `GET /api/masterbrain/evolution/ideas/top` - Get top upgrade suggestions
- ✅ `GET/POST /api/masterbrain/evolution/experiments` - List/create experiments
- ✅ `GET /api/masterbrain/evolution/briefing` - Get upgrade briefing

### Integration
- ✅ Brain Registry entry added (`master_brain_evolution_v1`)

---

## Overview

Master Brain Evolution Engine v1 is a self-improvement system that:
- **Turns diagnostics into ideas** - Converts findings into structured improvement ideas
- **Prioritizes suggestions** - Scores and ranks upgrade opportunities
- **Runs experiments** - Creates experiments to test improvements
- **Maintains changelog** - Logs visible system changes
- **Provides upgrade briefing** - Human-readable evolution narrative

---

## Database Schema

### system_improvement_ideas
Improvement ideas from various sources:
- source: diagnostics, user, dev, ai
- severity: low, medium, high
- impact_area: ux, performance, retention, accuracy, education, reliability
- effort_estimate: low, medium, high
- status: backlog, planned, in_experiment, done, dropped

### system_experiments
Experiments testing ideas:
- hypothesis: Testable hypothesis
- idea_ids: Array of related ideas
- target_metrics: Metrics to track
- status: planned, running, completed, cancelled

### system_experiment_runs
Concrete experiment runs:
- variant: control, v1, v2, etc.
- metrics_before/after: Snapshots
- outcome: improved, no_change, worse, inconclusive

### system_changelog
Visible system changes:
- title, description
- module_id, tags
- experiment_id (if tied to experiment)

### system_user_feedback
User feedback:
- module_id, capability_id
- rating: 1-5
- comment, context

---

## Core Functionality

### Idea Generator

`generateImprovementIdeasFromDiagnostics()`:
- Converts diagnostics findings into improvement ideas
- Maps severity: critical→high, warning→medium, info→low
- Maps category to impact_area: health→performance, usage→retention, etc.
- Avoids duplicates (checks existing ideas)

`generateGlobalImprovementSweep()`:
- Finds underused modules (coach/simulation with 0 usage)
- Creates "increase discoverability" ideas
- Analyzes low-rated user feedback
- Creates UX improvement ideas

### Suggestion Engine

`prioritizeImprovementIdeas()`:
- Scores ideas by:
  - Severity (high=10, medium=5, low=2)
  - Impact area (retention=8, accuracy=7, performance=6, etc.)
  - Module criticality (core=5, coach=3, etc.)
  - Usage volume (high-traffic modules get more weight)
- Returns sorted list

`getTopUpgradeSuggestions()`:
- Returns top N prioritized ideas

### Experiment Engine

`createExperimentForIdeas()`:
- Creates experiment from selected ideas
- Generates hypothesis if not provided (via LLM)
- Determines target metrics from impact areas
- Updates ideas status to 'in_experiment'

`summarizeExperimentOutcome()`:
- Analyzes metrics_before vs metrics_after
- Uses LLM to generate result_summary
- Determines outcome: improved, no_change, worse, inconclusive

### Changelog Engine

`logChangelogEntry()`:
- Logs visible system changes
- Links to modules and experiments
- Tags for categorization

### Upgrade Narrator

`getUpgradeBriefing()`:
- Gathers top suggestions, active experiments, recent changelog
- Uses LLM to generate human-readable narrative
- Sections: upgrade opportunities, experiments, recent improvements

---

## API Endpoints

### POST /api/masterbrain/evolution/ideas/from-diagnostics
Generates improvement ideas from a diagnostics run.

**Body:**
```json
{
  "diagnosticsRunId": "uuid"
}
```

**Response:**
```json
{
  "ideas": [...]
}
```

### GET /api/masterbrain/evolution/ideas/top
Returns top upgrade suggestions.

**Query params:**
- `limit` (default: 10)

**Response:**
```json
{
  "suggestions": [...]
}
```

### GET /api/masterbrain/evolution/experiments
Lists experiments.

**Query params:**
- `status` (optional)

**Response:**
```json
{
  "experiments": [...]
}
```

### POST /api/masterbrain/evolution/experiments
Creates a new experiment.

**Body:**
```json
{
  "name": "Boardroom adoption experiment",
  "ideaIds": ["uuid1", "uuid2"],
  "hypothesis": "optional"
}
```

**Response:**
```json
{
  "experiment": {...}
}
```

### GET /api/masterbrain/evolution/briefing
Returns upgrade briefing narrative.

**Response:**
```json
{
  "briefing": "..."
}
```

---

## Integration Points

### From Diagnostics → Ideas
- After diagnostics run completes
- Auto-generate ideas or manual trigger
- Button in Master Brain UI: "Turn Findings into Upgrade Ideas"

### From Ideas → Planner / Autopilot
- Selected ideas can create tasks in Weekly Planner
- Autopilot can generate "Builder Tasks" list
- Example: "Refine dashboard layout", "Add onboarding tooltips"

### From Changelog → User Comms
- Weekly Briefing can pull latest changelog
- Release Notes: "What's new in Pulse"
- Shows visible improvements to users

---

## Next Steps

### Frontend UI

#### Evolution Lab Tab in `/app/master-brain/page.tsx`
- **Section 1**: Top Upgrade Suggestions table
- **Section 2**: Experiments cards (planned/running/completed)
- **Section 3**: Changelog (chronological list)
- **Section 4**: Upgrade Briefing (narrative card)

### Enhanced Features
- Experiment variant management
- A/B testing infrastructure
- Automated experiment execution
- Feedback collection UI
- Changelog public view

---

## Impact

Pulse now has an **Evolution Engine** that:

1. **Turns Problems into Solutions** - Diagnostics → Ideas → Experiments
2. **Prioritizes Improvements** - Scores and ranks upgrade opportunities
3. **Tests Changes** - Structured experiments with metrics
4. **Tracks Evolution** - Changelog of visible improvements
5. **Provides Roadmap** - Upgrade briefing shows evolution story

This is the moment Pulse becomes **self-improving** - it not only knows what's wrong, but actively proposes and tests solutions.

🧠🛠️✨


