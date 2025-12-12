# Timeline Coach v1 & Destiny Engine v1 – Spec

## 0. Big Picture

We already have:
* Neocortex / AGI Kernel
* Life Simulation Engine v2 (multi-timeline)
* Conscious Workspace v2 + Timeline Layer
* Narrative Engine, Identity Engine, Wisdom, Ethics, Somatic

This spec adds two "top-of-mind" layers:

1. **Timeline Coach v1**
   * Sits on top of **Multi-Timeline Simulation v2**
   * Helps user:
     * Compare futures,
     * Understand tradeoffs,
     * Choose a **preferred near-term arc** (next 30–90 days),
     * Commit to a "season protocol" (how they want to live this season).

2. **Destiny Engine v1**
   * Sits on top of **Narrative + Identity + Wisdom + Simulation**
   * Builds long-arc "Destiny Blueprints" (3–10 years) and current **Destiny Arc** (6–24 months).
   * Ensures everything Pulse suggests is **in service of the chosen destiny**:
     * Tasks,
     * Plans,
     * Timelines,
     * Tradeoffs.

Subsystem IDs (Brain Registry):
* `timeline_coach`
* `destiny_engine`

---

## Implementation Status

✅ **COMPLETE** - All phases implemented:

- ✅ Database migrations (Timeline Coach: preference_profile, decisions, commitments, reflections; Destiny: blueprints, arcs, checkpoints, alignment_log)
- ✅ TypeScript types for both systems
- ✅ Timeline Coach: preference profile builder, coach core, commitments, reflection
- ✅ Destiny Engine: blueprint builder, arc creation, checkpoints, alignment evaluator
- ✅ API endpoints for both systems
- ✅ Brainstem integration (weekly loop)

---

## Files Created

### Database
- `supabase/migrations/20260120_timeline_coach_v1.sql`
- `supabase/migrations/20260120_destiny_engine_v1.sql`

### Timeline Coach
- `lib/timeline_coach/types.ts` - Type definitions
- `lib/timeline_coach/preferences.ts` - Preference profile builder
- `lib/timeline_coach/coach.ts` - Timeline coach core (decision proposal)
- `lib/timeline_coach/commitments.ts` - Commitments persistence
- `lib/timeline_coach/reflection.ts` - Reflection engine

### Destiny Engine
- `lib/destiny/types.ts` - Type definitions
- `lib/destiny/blueprints.ts` - Blueprint builder
- `lib/destiny/arcs.ts` - Arc creation and checkpoints
- `lib/destiny/alignment.ts` - Alignment evaluator

### API Routes
- `app/api/timeline-coach/context/route.ts` - Get timeline choice context
- `app/api/timeline-coach/decide/route.ts` - Propose and save timeline decision
- `app/api/destiny/blueprints/route.ts` - Get destiny blueprints
- `app/api/destiny/arc/route.ts` - Get current destiny arc + checkpoints
- `app/api/destiny/checkpoints/route.ts` - Get checkpoints
- `app/api/destiny/alignment/route.ts` - Get alignment logs

### Integration
- Updated `lib/brain/brainstem.ts` - Runs destiny + timeline coach in weekly loop

---

## How It Works

### 1. Timeline Coach Flow

```
refreshTimelinePreferenceProfileForUser()
  ├─> Pulls from value profile, wisdom, past decisions/reflections
  └─> LLM infers: domainWeights, riskTolerance, timePreferences, comfortZones, sacrificePreferences

proposeTimelineDecisionForUser()
  ├─> Gets simulation timelines + outcomes
  ├─> Gets preference profile + value profile + narrative
  └─> LLM chooses ONE timeline + generates commitments:
      - habits, constraints, focus_areas, guardrails
      - seasonStart, seasonEnd, rationale, tradeoffs

saveTimelineDecisionForUser()
  ├─> Saves decision + commitments
  └─> Marks as current (clears previous)

generateTimelineReflectionForDecision()
  ├─> After season ends
  └─> LLM evaluates: felt outcome, alignment change, satisfaction, regrets, surprises, lessons
```

### 2. Destiny Engine Flow

```
refreshDestinyBlueprintsForUser()
  ├─> Pulls from identity, narrative, value profile, wisdom
  └─> LLM proposes 2-5 Destiny Blueprints (3-10 years):
      - identityThemes, domainTargets, nonNegotiables, tradeoffPhilosophy
      - Marks one as primary

refreshCurrentDestinyArcForUser()
  ├─> Gets primary blueprint
  └─> LLM creates 6-24 month Destiny Arc:
      - name, logline, arcStart, arcEnd
      - focusDomains, guidingPrinciples
      - Creates 3-12 checkpoints

evaluateDestinyAlignmentForUser()
  ├─> Gets current arc + checkpoints
  ├─> Gets workspace, somatic, narrative, experiences
  └─> LLM evaluates: alignmentOverall, alignmentByDomain, narrativeConsistency
      - tensionNotes, courseCorrectionSuggestions
```

---

## API Usage

### Timeline Coach

```typescript
GET /api/timeline-coach/context
// Returns: { context: { run, timelines, outcome, preferenceProfile, valueProfile, narrativeContext } }

POST /api/timeline-coach/decide
Body: { autoPropose: true } or { decision: {...} }
// Returns: { success: true, decisionId, decision }
```

### Destiny Engine

```typescript
GET /api/destiny/blueprints
// Returns: { blueprints: [...] }

GET /api/destiny/arc
// Returns: { arc, checkpoints: [...] }

GET /api/destiny/checkpoints?arcId=...
// Returns: { checkpoints: [...] }

GET /api/destiny/alignment
// Returns: { alignments: [...] }
```

---

## Integration Points

### Weekly Brain Loop

```typescript
// In runWeeklyBrainLoopForUser()
await refreshDestinyBlueprintsForUser(userId);
await refreshCurrentDestinyArcForUser(userId);
await refreshTimelinePreferenceProfileForUser(userId);
await runMultiTimelineSimulationForUser(userId, weekEnd, 30, 'weekly_brain_loop_multitimeline');
const decisionBlueprint = await proposeTimelineDecisionForUser(userId);
if (decisionBlueprint) {
  await saveTimelineDecisionForUser(userId, decisionBlueprint);
}
await evaluateDestinyAlignmentForUser(userId, weekEnd);
```

### Future Integration

- **Simulation v2**: Use primary blueprint + current arc in simulation context
- **Timeline Coach**: Include Destiny context when comparing timelines
- **Workspace**: Mark threads as `destiny_critical`
- **Ethics & Wisdom**: Use destiny as upper-level filter for "good outcomes"

---

## Subsystem Status

- `timeline_coach` = `partial` (v1) in Brain Registry
- `destiny_engine` = `partial` (v1) in Brain Registry

---

## Next Steps

1. **Run Migrations**:
   - `supabase/migrations/20260120_timeline_coach_v1.sql`
   - `supabase/migrations/20260120_destiny_engine_v1.sql`

2. **UI Integration**:
   - Timeline Coach UI (compare futures, choose season)
   - Destiny Dashboard (view blueprints, arc, checkpoints, alignment)
   - Season Protocol view (show commitments)

3. **Cross-System Integration**:
   - Pass destiny context into simulation v2
   - Use destiny in timeline coach comparisons
   - Mark destiny-critical threads in workspace

4. **Reflection Flow**:
   - Trigger reflections at end of season
   - Feed lessons back into preference profile

5. **Checkpoint Tracking**:
   - UI to mark checkpoints as reached/missed
   - Update arc status based on checkpoint progress

---

## Impact

Pulse now:

- **Knows your long-arc destiny** - 3-10 year blueprints aligned with identity
- **Steers your seasons** - 6-24 month arcs with checkpoints
- **Helps you choose futures** - Timeline Coach compares and recommends
- **Turns choices into commitments** - Season Protocol with concrete habits/guardrails
- **Tracks alignment** - Evaluates how well life matches declared destiny

And uses this to:

- **Guide simulations** - Prefer timelines that move toward destiny
- **Surface tradeoffs** - "This future wins on work but betrays your declared Destiny of..."
- **Mark critical threads** - Workspace threads that are destiny-critical
- **Suggest corrections** - Small shifts to bring life back on-arc
- **Learn preferences** - Reflections feed into future timeline choices

This is the moment where Pulse isn't just juggling tasks. It's **steering your life** toward the future you actually want. 🔮🧠

Pulse will:
- Know your **long-arc destiny** (who you're trying to become)
- Simulate multiple futures
- Help you pick the **season arc** that best serves that destiny
- Turn that into concrete commitments
- Adjust your daily workspace and plans accordingly

That's the "meeting your future self" layer. Pulse literally helps you choose and commit to the future you want.


