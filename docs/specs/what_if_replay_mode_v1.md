# What-If Replay Mode v1 – Alternate Timeline Simulator

## 0. Purpose

What-If Replay Mode lets Pulse:

* Take a **past or hypothetical decision**
* Branch the **Timeline / Destiny model**
* Simulate alternate outcomes across:
  * career / money
  * relationships
  * health & energy
  * identity & narrative arc
* Present a **side-by-side "timeline comparison"** in Decision Theater

Scenarios:

* "What if I had left OGB last year?"
* "What if I double down on Pulse for the next 12 months?"
* "What if I go all-in on health for 90 days?"
* "What if I say yes to this deal and no to these others?"

Subsystem ID: `what_if_replay_mode_v1`.

---

## Implementation Status

✅ **COMPLETE** - All phases implemented:

### What-If Replay Mode v1
- ✅ Database migrations (3 tables: what_if_scenarios, what_if_runs, what_if_outcomes)
- ✅ TypeScript types
- ✅ Context builder (buildWhatIfSimulationContext)
- ✅ LLM prompts (WHAT_IF_TIMELINE_PROMPT, WHAT_IF_NARRATIVE_PROMPT)
- ✅ Simulation engine (createWhatIfScenario, runWhatIfSimulation)
- ✅ API endpoints (POST /api/what-if/from-council, POST /api/what-if/manual, GET /api/what-if/run/:id)
- ✅ Decision Theater integration (WhatIfReplay component)
- ✅ Brain Registry integration (what_if_replay_mode_v1)

---

## Files Created

### Database
- `supabase/migrations/20260120_what_if_replay_mode_v1.sql` - Creates 3 tables for what-if scenarios

### What-If Replay Modules
- `lib/what_if_replay/v1/types.ts` - Type definitions
- `lib/what_if_replay/v1/context.ts` - Context builder
- `lib/what_if_replay/v1/prompts.ts` - LLM prompts
- `lib/what_if_replay/v1/simulate.ts` - Simulation engine

### API Routes
- `app/api/what-if/from-council/route.ts` - Create what-if from council session
- `app/api/what-if/manual/route.ts` - Create manual what-if scenario
- `app/api/what-if/run/[id]/route.ts` - Get what-if run details

### Decision Theater Integration
- `components/decision-theater/WhatIfReplay.tsx` - What-If Replay component
- Updated `app/decision-theater/session/[sessionId]/page.tsx` - Added What-If section

### Integration
- Updated `supabase/migrations/20260120_master_brain_registry_and_diagnostics_v1.sql`:
  - Added what_if_replay_mode_v1 to brain_subsystems

---

## How It Works

### What-If Simulation Flow

```
1. Create Scenario
   createWhatIfScenario()
     ├─> Stores scenario definition:
     │   - label, description
     │   - origin_type (council_session, dossier, manual)
     │   - base_assumption vs alternate_assumption
     │   - anchor_time, timescale
     └─> Returns scenarioId

2. Run Simulation
   runWhatIfSimulation()
     ├─> buildWhatIfSimulationContext()
     │   ├─> Collects context from all subsystems:
     │   │   - Destiny arcs
     │   │   - Timeline decisions
     │   │   - Narrative & identity
     │   │   - Financial state
     │   │   - Health state
     │   │   - Relationships
     │   │   - Culture
     │   └─> Returns WhatIfSimulationContext
     │
     ├─> LLM Timeline Simulation
     │   ├─> WHAT_IF_TIMELINE_PROMPT
     │   ├─> Generates baseline_timeline and alternate_timeline
     │   ├─> Computes deltas (better/worse domains, tradeoffs)
     │   └─> Stores in what_if_runs
     │
     ├─> LLM Narrative Generation
     │   ├─> WHAT_IF_NARRATIVE_PROMPT
     │   ├─> Generates narrative_baseline and narrative_alternate
     │   ├─> Extracts metrics_baseline and metrics_alternate
     │   ├─> Builds highlight_differences
     │   └─> Stores in what_if_outcomes
     │
     └─> Returns complete simulation result
```

### Timeline Structure

Each timeline includes:
- **keyEvents**: List of dated/ordered events across career, relationships, health, money, identity
- **metrics**: High-level metrics (income, role, relationship_quality, health_score, stress_level, purpose_alignment)
- **narrativeSummary**: Short story of the path

### Deltas Structure

- **betterDomains**: Domains where alternate path is better
- **worseDomains**: Domains where alternate path is worse
- **keyTradeoffs**: Short-term and long-term tradeoffs

---

## API Endpoints

### POST /api/what-if/from-council
Creates a what-if scenario from a council session.

**Body:**
```json
{
  "sessionId": "uuid",
  "mode": "prospective",
  "horizon": "1_year",
  "alternateAssumption": "Follow the council recommendation fully.",
  "baseAssumptionOverride": "Do what I'm currently planning instead (status quo)."
}
```

**Response:**
```json
{
  "scenarioId": "uuid",
  "runId": "uuid",
  "baseline": { "keyEvents": [...], "metrics": {...}, "narrativeSummary": "..." },
  "alternate": { "keyEvents": [...], "metrics": {...}, "narrativeSummary": "..." },
  "deltas": { "betterDomains": [...], "worseDomains": [...], "keyTradeoffs": [...] },
  "narrativeBaseline": "...",
  "narrativeAlternate": "...",
  "metricsBaseline": {...},
  "metricsAlternate": {...},
  "highlightDifferences": [...]
}
```

### POST /api/what-if/manual
Creates a manual what-if scenario.

**Body:**
```json
{
  "label": "What if I left OGB last year?",
  "description": "...",
  "baseAssumption": "I stayed at OGB",
  "alternateAssumption": "I left OGB in Jan 2025",
  "mode": "retro",
  "horizon": "1_year",
  "anchorTime": "2025-01-01T00:00:00Z",
  "timescale": "year"
}
```

**Response:** Same as `/api/what-if/from-council`

### GET /api/what-if/run/:id
Gets a what-if run and its outcome.

**Response:**
```json
{
  "run": { ...what_if_runs row },
  "outcome": { ...what_if_outcomes row },
  "scenario": { ...what_if_scenarios row }
}
```

---

## Decision Theater Integration

### What-If Replay Component

Added to `/decision-theater/session/[sessionId]`:

- **Horizon selector**: 6 months, 1 year, 3 years, 5 years
- **Mode selector**: Going Forward (prospective) or Looking Back (retro)
- **Alternate Assumption**: What if I follow the council recommendation?
- **Base Assumption** (optional): What if I don't follow? (defaults to current plan)
- **Simulate Timelines** button

### Results Display

After simulation:
- **Side-by-side cards**: Baseline Path vs Alternate Path
  - Narrative story
  - Metrics comparison
- **Key Differences**: Bullet list of most important changes
- **Tradeoffs**: Better domains, worse domains, key tradeoffs

---

## Integration Points

### Executive Council
- What-If can be triggered from council sessions
- Shows "what if I follow vs don't follow" the council recommendation

### Decision Dossiers
- What-If scenarios can be linked to dossiers
- Allows "what if I had chosen differently" for past decisions

### Destiny / Timeline Engine
- Uses destiny arcs and timeline decisions as context
- Simulates how alternate choices affect long-term trajectory

### Strategic Mind
- What-If outcomes can inform future strategic recommendations
- Helps Strategic Mind understand tradeoffs better

---

## Next Steps

1. **Enhanced Visualization**:
   - Timeline visualization showing key events side-by-side
   - Metrics comparison charts
   - Risk profile comparison

2. **Multiple Scenarios**:
   - Compare more than 2 paths
   - "What if A vs B vs C" comparisons

3. **Learning Loop**:
   - Track actual outcomes vs what-if predictions
   - Improve simulation accuracy over time
   - Feed back into Wisdom Engine

4. **Life Canon Integration** (Future):
   - Incorporate what-if scenarios into persistent life story
   - Track "roads not taken" as part of identity narrative

---

## Impact

Pulse now:

- **Simulates alternate futures** - Shows what could happen with different choices
- **Compares paths** - Side-by-side comparison of baseline vs alternate
- **Reveals tradeoffs** - Shows what's better/worse in each domain
- **Time travel** - Retrospective "what if I had..." and prospective "what if I do..."
- **Visual storytelling** - Narrative summaries of each path

And users can:

- **Explore alternatives** - "What if I had left OGB last year?"
- **See tradeoffs** - Understand what's gained/lost with each choice
- **Make informed decisions** - See projected outcomes before committing
- **Learn from past** - Revisit past decisions and see alternate paths
- **Plan future** - Simulate different strategies and see outcomes

This is the moment when Pulse stops being "a decision advisor" and becomes a **time machine** that lets you explore alternate realities and see the consequences of different choices before you make them.

🧠⏳✨


