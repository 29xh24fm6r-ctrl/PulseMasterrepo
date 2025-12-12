# Creative Cortex v2 & Global Sense of Self Mirror v1 – Spec

## 0. Big Picture

We already have:
* Neocortex / AGI Kernel
* Multi-Timeline Simulation v2
* Destiny Engine & Timeline Coach
* Narrative Engine
* Identity & Values
* Wisdom / Meta-learning
* Culture & Emotion layers
* Conscious Workspace

This spec adds:

1. **Creative Cortex v2 (`creative_cortex_v2`)**
   A cross-domain **innovation & strategy engine** that:
   * Generates and refines ideas (products, strategies, conversations, scripts, deals, life experiments).
   * Evaluates ideas against: Destiny, values, culture, emotional state, timelines.
   * Captures **creative artifacts** and patterns so future ideation gets *smarter*.

2. **Global Sense of Self Mirror v1 (`self_mirror_v1`)**
   A weekly/daily **"Who am I becoming?" mirror** that:
   * Synthesizes: Identity, Destiny, Narrative, Behavior, Relationships, Somatic, Values.
   * Surfaces: Alignment, drift, contradictions, emerging strengths, new patterns.
   * Feeds back into: Identity Engine, Destiny Engine, Timeline Coach, Emotional Style.

---

## Implementation Status

✅ **COMPLETE** - All phases implemented:

- ✅ Database migrations (Creative Cortex: sessions, ideas, artifacts, evaluations, patterns; Self Mirror: snapshots, deltas, highlights)
- ✅ TypeScript types for both systems
- ✅ Creative Cortex: session creation, idea generation, evaluation, artifact generation, pattern learning
- ✅ Self Mirror: snapshot builder, delta builder, highlights generator
- ✅ API endpoints for both systems
- ✅ Brainstem integration (weekly loop)

---

## Files Created

### Database
- `supabase/migrations/20260120_creative_cortex_v2.sql`
- `supabase/migrations/20260120_global_self_mirror_v1.sql`

### Creative Cortex v2
- `lib/creative/v2/types.ts` - Type definitions
- `lib/creative/v2/sessions.ts` - Session creation
- `lib/creative/v2/generator.ts` - Idea generator
- `lib/creative/v2/evaluator.ts` - Idea evaluator/ranker
- `lib/creative/v2/artifacts.ts` - Artifact generator
- `lib/creative/v2/patterns.ts` - Pattern learning

### Global Sense of Self Mirror v1
- `lib/self_mirror/types.ts` - Type definitions
- `lib/self_mirror/snapshot.ts` - Snapshot builder
- `lib/self_mirror/delta.ts` - Delta builder
- `lib/self_mirror/highlights.ts` - Highlights generator

### API Routes
- `app/api/creative/sessions/route.ts` - Create/list creative sessions
- `app/api/creative/ideas/route.ts` - List/update ideas, generate artifacts
- `app/api/creative/artifacts/route.ts` - List artifacts
- `app/api/self-mirror/snapshot/route.ts` - Get self mirror snapshots
- `app/api/self-mirror/delta/route.ts` - Get self mirror deltas
- `app/api/self-mirror/highlights/route.ts` - Get self mirror highlights

### Integration
- Updated `lib/brain/brainstem.ts` - Runs creative patterns refresh and self mirror snapshot/delta/highlights in weekly loop

---

## How It Works

### 1. Creative Cortex v2 Flow

```
createCreativeSessionForUser()
  ├─> Creates session with topic, goal, domain, mode, context
  └─> Stores: workspaceThread, destiny, timeline, culture, emotion, somatic

generateCreativeIdeasForSession()
  ├─> Gets destiny, timeline, culture, emotion, somatic context
  └─> LLM generates 5-20 ideas with:
      - title, description, category, tags
      - scores: overall, alignment, impact, feasibility, energyFit

reRankCreativeIdeasForSession()
  ├─> Gets destiny + timeline context
  └─> LLM re-scores ideas, provides decisions (prioritize/later/drop)

generateArtifactsForIdea()
  ├─> Gets idea details
  └─> LLM generates 1-3 concrete artifacts (scripts, specs, protocols, playbooks)

refreshCreativePatternsForUser()
  ├─> Gets all ideas + evaluations
  └─> LLM identifies patterns:
      - characteristics of successful ideas
      - anti-patterns to avoid
      - recommendations for future ideation
```

### 2. Global Sense of Self Mirror v1 Flow

```
createSelfMirrorSnapshotForUser()
  ├─> Pulls from: identity, destiny, narrative, values, wisdom, emotion, somatic, social
  └─> LLM synthesizes:
      - identityState, destinyState, narrativeState, valuesAlignment
      - behaviorProfile, emotionalProfile, relationalProfile, somaticProfile
      - overallAlignment, driftScore, selfCompassionScore
      - narrativeSummary, mirrorInsights

createSelfMirrorDeltaForUser()
  ├─> Compares two snapshots (week-over-week)
  └─> LLM describes changes:
      - alignmentChange, driftChange, selfCompassionChange
      - identityShifts, behaviorShifts, emotionalShifts, relationalShifts, somaticShifts
      - summary, keyQuestions

createSelfMirrorHighlightsForUser()
  ├─> Gets snapshot + delta
  └─> LLM extracts 3-12 highlights:
      - wins, risks, patterns, pivots, breakthroughs
      - with suggestedActions
```

---

## API Usage

### Creative Cortex

```typescript
POST /api/creative/sessions
Body: { topic, goal, domain, mode, context, generateIdeas }
// Creates session, optionally generates ideas

GET /api/creative/sessions
// Lists all sessions

GET /api/creative/ideas?sessionId=...&status=...
// Lists ideas (filterable by session, status)

PATCH /api/creative/ideas
Body: { ideaId, status, generateArtifacts, rerankSession }
// Updates idea status, generates artifacts, re-ranks session

GET /api/creative/artifacts?ideaId=...&sessionId=...
// Lists artifacts
```

### Self Mirror

```typescript
GET /api/self-mirror/snapshot?date=...&limit=...
// Gets snapshots (filterable by date)

GET /api/self-mirror/delta?limit=...
// Gets deltas

GET /api/self-mirror/highlights?snapshotId=...&deltaId=...&limit=...
// Gets highlights (filterable by snapshot/delta)
```

---

## Integration Points

### Weekly Brain Loop

```typescript
// In runWeeklyBrainLoopForUser()
await refreshCreativePatternsForUser(userId);

const snapshotId = await createSelfMirrorSnapshotForUser(userId, weekEnd);
const deltaId = await createSelfMirrorDeltaForUser(userId);
if (snapshotId || deltaId) {
  await createSelfMirrorHighlightsForUser(userId, snapshotId, deltaId);
}
```

### Future Integration

- **Workspace**: From a thread, "Ask Creative Cortex" → create session & ideas, attach top ideas/artifacts to workspace thread
- **Destiny & Timeline**: Creative ideas are scored by alignment, Timeline Coach can pull "creative options" for a given season
- **Autopilot / Projects**: Turn selected ideas into tasks, projects, campaigns
- **Identity Engine**: Use snapshots/deltas to update identity narratives and roles emphasis
- **Destiny & Timeline**: Self mirror influences arc adjustments, Timeline Coach tradeoffs, Destiny alignment diagnostics
- **Emotion & Coaching**: Self-compassion + drift can shape tone (don't push when they're already self-critical), type of interventions (more support vs more discipline)
- **UI**: Self Mirror dashboard showing "Who you've been this week", "How you're changing", 3–5 highlights + questions

---

## Subsystem Status

- `creative_cortex_v2` = `partial` (v2) in Brain Registry
- `self_mirror_v1` = `partial` (v1) in Brain Registry

---

## Next Steps

1. **Run Migrations**:
   - `supabase/migrations/20260120_creative_cortex_v2.sql`
   - `supabase/migrations/20260120_global_self_mirror_v1.sql`

2. **Creative Cortex Integration**:
   - UI for creating sessions and viewing ideas
   - Workspace integration ("Ask Creative Cortex" from threads)
   - Autopilot integration (turn ideas into tasks/projects)
   - Use creative patterns in future idea generation

3. **Self Mirror Integration**:
   - UI dashboard for self mirror (snapshots, deltas, highlights)
   - Feed insights back into Identity Engine, Destiny Engine, Timeline Coach
   - Use self-compassion + drift to shape emotional resonance tone

4. **Cross-System Integration**:
   - Use creative patterns in idea generation prompts
   - Use self mirror insights in coaching and workspace
   - Feed self mirror deltas into wisdom engine

---

## Impact

Pulse now:

- **Generates world-class ideas** - Tuned to your destiny, culture, energy, and season
- **Evaluates ideas intelligently** - Scores by alignment, impact, feasibility, energy fit
- **Creates concrete artifacts** - Scripts, specs, protocols, playbooks to execute ideas
- **Learns what works** - Patterns of successful vs failed ideas
- **Holds up a mirror** - Shows who you've actually been lately vs who you want to be
- **Tracks evolution** - Week-over-week changes in alignment, drift, self-compassion
- **Surfaces highlights** - Wins, risks, patterns, pivots, breakthroughs

And uses this to:

- **Guide ideation** - Future ideas informed by what's worked before
- **Shape interventions** - Adjust tone and type based on self-compassion and drift
- **Update identity** - Use mirror insights to refine identity narratives
- **Adjust destiny arcs** - Use alignment/drift to refine destiny arcs and timeline choices
- **Generate actionable insights** - Highlights with suggested actions for coaching

This is the moment where Pulse doesn't just manage your life—it **creates with you** and **holds up a mirror** as you evolve. It looks at *who you are* and *what you're creating* across your whole life.

🧠✨


