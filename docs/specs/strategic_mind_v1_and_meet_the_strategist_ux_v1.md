# Strategic Mind v1 + "Meet the Strategist" UX v1

## 0. Purpose

This spec does two things:

1. Implements **Strategic Mind v1**
   – the meta-agent that integrates all subsystems and generates coherent life strategy.

2. Adds **"Meet the Strategist" UX v1**
   – the user-facing layer where Pulse:
   * explains its strategic stance in plain language
   * shows top conflicts and tradeoffs
   * shows its recommendations
   * lets the user **approve / tweak / reject** them.

Subsystem IDs:
* `strategic_mind_v1` (executive brain system)
* `strategic_strategist_ux_v1` (UX & API layer)

---

## Implementation Status

✅ **COMPLETE** - All phases implemented:

### Strategic Mind v1 (Backend)
- ✅ Database migrations (5 tables: goal_hierarchy, strategic_state_snapshots, strategic_conflicts, strategic_equilibria, strategy_recommendations)
- ✅ TypeScript modules (types, aggregate_signals, prompts, conflict_detection, equilibrium_solver, recommendations, snapshot, context_read, goal_model)
- ✅ Brainstem integration (daily + weekly loops)
- ✅ Brain Registry integration (strategic_mind_v1)

### Meet the Strategist UX v1
- ✅ Database migrations (3 tables: strategist_sessions, strategic_review_events, strategy_feedback)
- ✅ TypeScript modules (prompts, explain, session, feedback)
- ✅ API endpoints (5 routes: start, complete, feedback, qa, overview)
- ✅ Brain Registry integration (strategic_strategist_ux_v1)

---

## Files Created

### Database
- `supabase/migrations/20260120_strategic_mind_v1.sql` - Strategic Mind tables
- `supabase/migrations/20260120_meet_the_strategist_ux_v1.sql` - Strategist UX tables

### Strategic Mind v1 Modules
- `lib/strategic_mind/v1/types.ts` - Type definitions
- `lib/strategic_mind/v1/prompts.ts` - LLM prompts
- `lib/strategic_mind/v1/aggregate_signals.ts` - Signal aggregator
- `lib/strategic_mind/v1/conflict_detection.ts` - Conflict detection
- `lib/strategic_mind/v1/equilibrium_solver.ts` - Equilibrium solver
- `lib/strategic_mind/v1/recommendations.ts` - Recommendations generator
- `lib/strategic_mind/v1/snapshot.ts` - Strategic snapshot builder
- `lib/strategic_mind/v1/context_read.ts` - Context reader
- `lib/strategic_mind/v1/goal_model.ts` - Goal hierarchy management

### Meet the Strategist UX Modules
- `lib/strategic_mind/v1/strategist_ux/prompts.ts` - Explanation and Q&A prompts
- `lib/strategic_mind/v1/strategist_ux/explain.ts` - Explanation builder and Q&A
- `lib/strategic_mind/v1/strategist_ux/session.ts` - Session management
- `lib/strategic_mind/v1/strategist_ux/feedback.ts` - Feedback handler

### API Routes
- `app/api/strategist/session/start/route.ts` - Start strategist session
- `app/api/strategist/session/complete/route.ts` - Complete session
- `app/api/strategist/feedback/route.ts` - Submit feedback
- `app/api/strategist/qa/route.ts` - Q&A endpoint
- `app/api/strategist/overview/route.ts` - Overview for Conscious Console

### Integration
- Updated `lib/brain/brainstem.ts`:
  - Strategic Mind snapshot in daily loop (step 11)
  - Strategic Mind snapshot in weekly loop (step 13)
- Updated `supabase/migrations/20260120_master_brain_registry_and_diagnostics_v1.sql`:
  - Added strategic_mind_v1 to brain_subsystems
  - Added strategic_strategist_ux_v1 to brain_subsystems

---

## How It Works

### Strategic Mind Flow

```
1. Signal Aggregation
   buildStrategicSignalBundle()
     ├─> Collects signals from all subsystems
     └─> Returns StrategicSignalBundle

2. Conflict Detection
   detectStrategicConflicts()
     ├─> LLM detects conflicts
     └─> Stores in strategic_conflicts

3. Equilibrium Solving
   solveStrategicEquilibrium()
     ├─> LLM proposes equilibrium
     └─> Stores in strategic_equilibria

4. Strategy Recommendations
   generateStrategyRecommendations()
     ├─> LLM generates recommendations
     └─> Stores in strategy_recommendations

5. Strategic Snapshot
   runStrategicMindSnapshot()
     ├─> Orchestrates full flow
     └─> Stores in strategic_state_snapshots
```

### Meet the Strategist UX Flow

```
1. Start Session
   startStrategistSession()
     ├─> buildStrategicExplanation()
     │   ├─> Gets latest snapshot, equilibrium, conflicts, recommendations
     │   └─> LLM generates introNarrative and keyPoints
     ├─> Creates strategist_sessions record
     └─> Records strategic_review_events

2. User Reviews
   - Sees introNarrative (plain language explanation)
   - Sees keyPoints (3-7 strategic priorities)
   - Sees equilibrium (chosen stance)
   - Sees conflicts (tensions being resolved)
   - Sees recommendations (actionable steps)

3. User Feedback
   submitStrategyFeedback()
     ├─> Records feedback in strategy_feedback
     ├─> Updates recommendation status
     └─> Optionally updates brain preferences

4. Q&A
   answerStrategistQuestion()
     ├─> LLM answers user questions
     └─> References goals, conflicts, values, constraints
```

---

## API Endpoints

### POST /api/strategist/session/start
Starts a new strategist session.

**Response:**
```json
{
  "sessionId": "uuid",
  "introNarrative": "2-5 paragraphs explaining Pulse's strategic stance",
  "keyPoints": [
    {
      "label": "Protect Energy",
      "summary": "Limit after-hours work 2 nights this week",
      "timescale": "week",
      "importance": 0.8,
      "scope": "work"
    }
  ],
  "equilibrium": { ... },
  "conflicts": [ ... ],
  "recommendations": [ ... ]
}
```

### POST /api/strategist/session/complete
Completes a strategist session.

**Body:**
```json
{
  "sessionId": "uuid",
  "userReaction": { "sentiment": "positive", "notes": "..." }
}
```

### POST /api/strategist/feedback
Submits feedback on a recommendation.

**Body:**
```json
{
  "recommendationId": "uuid",
  "sessionId": "uuid",
  "reaction": "accept" | "reject" | "modify" | "defer",
  "notes": "optional notes",
  "prefsPatch": { "lessWorkPush": true, "moreRelationshipFocus": true }
}
```

### POST /api/strategist/qa
Asks a question to the strategist.

**Body:**
```json
{
  "question": "Why did you prioritize work over relationships this week?"
}
```

**Response:**
```json
{
  "answer": "I prioritized work because..."
}
```

### GET /api/strategist/overview
Gets overview for Conscious Console.

**Response:**
```json
{
  "equilibrium": { ... },
  "topRecommendations": [ ... ],
  "recentConflicts": [ ... ]
}
```

---

## Integration Points

### Conscious Console
- Use `GET /api/strategist/overview` to show strategic section
- Display latest equilibrium, top recommendations, recent conflicts

### Brain Preferences
- Feedback with `prefsPatch` updates `pulse_brain_preferences`
- Allows user to steer Strategic Mind behavior

### Strategic Mind
- Strategist UX reads from Strategic Mind tables
- Feedback influences future recommendations
- User reactions inform equilibrium solving

---

## Next Steps

1. **UI Implementation**:
   - Build "Meet the Strategist" page/component
   - Show introNarrative, keyPoints, equilibrium, conflicts, recommendations
   - Add feedback buttons (accept/reject/modify/defer)
   - Add Q&A interface

2. **Conscious Console Integration**:
   - Add "Strategic" section showing overview
   - Link to full "Meet the Strategist" experience

3. **Learning Loop**:
   - Track which recommendations users accept/reject
   - Learn from feedback to improve future recommendations
   - Refine equilibrium solving based on user preferences

4. **Executive Council Mode** (Future):
   - Strategic Mind, Ethnographic Intelligence, Relational Mind, Financial Coach
   - Each gives POV on decisions like a boardroom of AIs

---

## Impact

Pulse now:

- **Thinks strategically** - Single executive brain that unifies all subsystems
- **Explains itself** - Plain language explanations of strategic stance
- **Shows tradeoffs** - Transparent about conflicts and tensions
- **Takes feedback** - User can approve, reject, modify, or defer recommendations
- **Learns preferences** - Feedback updates brain preferences for future decisions
- **Answers questions** - Q&A interface for understanding strategic thinking

And users can:

- **Review strategy** - See what Pulse thinks matters most right now
- **Understand tradeoffs** - See conflicts between goals, needs, constraints
- **Steer direction** - Accept/reject/modify recommendations
- **Ask why** - Get explanations for strategic decisions
- **Set preferences** - Influence how Strategic Mind thinks

This is the moment when Pulse stops being "a black box AI" and becomes a **transparent strategic partner** that you can sit down with and have a strategy meeting about your life, career, deals, and relationships.

🧠👔✨


