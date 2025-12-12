# 🧠 Life Canon v1 – The Master Story Engine of Pulse Brain

## 0. Purpose

Life Canon is your *personal mythology engine* — the evolving story Pulse writes **about your life as it unfolds**.

It is:
* a **structured narrative model**
* a **timeline of chapters**
* a **library of turning points**
* an **archive of choices and consequences**
* a **map of your internal evolution**
* a **narrative interface for all brain modules**

This is where everything Pulse learns gets *woven into the story of who you are and who you're becoming*.

---

## Implementation Status

✅ **COMPLETE** - All phases implemented:

### Life Canon v1
- ✅ Database migrations (5 tables: life_chapters, canon_events, identity_transforms, canon_timeline_index, life_canon_snapshots)
- ✅ TypeScript types
- ✅ Context builder (buildLifeCanonContext)
- ✅ LLM prompts (Chapter Builder, Event Extractor, Identity Shift Detector, Narrative Snapshot)
- ✅ Chapter builder (buildCurrentChapterForUser)
- ✅ Event extractor (extractCanonEventsForUser)
- ✅ Identity shift detector (detectIdentityShiftsForUser)
- ✅ Snapshot generator (createLifeCanonSnapshotForUser)
- ✅ Canon updater (refreshLifeCanonForUser)
- ✅ API endpoints (5 endpoints)
- ✅ Brain integration (weekly brain loop)
- ✅ Brain Registry integration (life_canon_v1)

---

## Files Created

### Database
- `supabase/migrations/20260120_life_canon_v1.sql` - Creates 5 tables for Life Canon

### Life Canon Modules
- `lib/life_canon/v1/types.ts` - Type definitions
- `lib/life_canon/v1/narrative_prompts.ts` - LLM prompts
- `lib/life_canon/v1/context.ts` - Context builder
- `lib/life_canon/v1/chapter_builder.ts` - Chapter builder
- `lib/life_canon/v1/event_extractor.ts` - Event extractor
- `lib/life_canon/v1/identity_shift_detector.ts` - Identity shift detector
- `lib/life_canon/v1/snapshot.ts` - Snapshot generator
- `lib/life_canon/v1/canon_updater.ts` - Canon updater (orchestrator)

### API Routes
- `app/api/life-canon/snapshot/run/route.ts` - Run snapshot
- `app/api/life-canon/current/route.ts` - Get current state
- `app/api/life-canon/timeline/route.ts` - Get timeline
- `app/api/life-canon/chapter/[id]/route.ts` - Get chapter
- `app/api/life-canon/event/[id]/route.ts` - Get event

### Integration
- Updated `lib/brain/brainstem.ts`:
  - Added `refreshLifeCanonForUser` to `runWeeklyBrainLoopForUser`
  - Added subsystem status update for `life_canon_v1`
- Updated `supabase/migrations/20260120_master_brain_registry_and_diagnostics_v1.sql`:
  - Added `life_canon_v1` to `brain_subsystems`

---

## Core Responsibilities

### 1️⃣ Define "Life Chapters"

Pulse identifies periods of life such as:
* The Rebuild
* The Expansion
* The Battle
* The Breaking Point
* The Ascent
* The Becoming
* The Reinvention
* The Legacy Phase

Each with:
* emotional tone
* goals
* internal conflicts
* external pressures
* identity shifts
* cultural context
* relationship arcs
* career/financial status
* Destiny Engine trajectory

### 2️⃣ Track "Canon Events"

Canon Events are **milestones of self-definition**, e.g.:
* Becoming a father
* Starting Pulse
* Leaving a job
* Major financial shift
* A personal crisis
* A career breakthrough
* A pivotal deal
* A relationship turning point
* A health transformation

Canon Events feed:
* Strategic Mind
* Narrative Intelligence
* Wisdom Engine
* Timeline Engine
* What-If Replay

### 3️⃣ Capture "Internal Transformations"

Every time identity, values, or worldview shift, Pulse records it as:
* A narrative beat
* An identity vector shift
* A new archetype emerging
* A change to the user's "life thesis"

### 4️⃣ Maintain "Life Throughlines"

These are the themes that follow you:
* Growth
* Responsibility
* Mastery
* Love
* Ambition
* Discipline
* Creativity
* Freedom

Pulse tracks which themes rise or fall over time.

### 5️⃣ Integrate the Full Brain

Life Canon becomes the **narrative glue** tying together:
* Relationship Engine → relationship arcs
* Somatic Engine → energy cycles
* Strategic Mind → internal/outer conflicts
* Timeline Engine → forward projection
* Memory & Replay → story accuracy
* Executive Council → key decisions
* Wisdom Engine → life lessons

### 6️⃣ Provide a "Life Story API"

This API gives every Pulse component access to:
* current chapter
* current archetype
* active conflicts
* narrative tone
* upcoming transitions
* emotional arcs
* long-term story arc trajectory

Pulse becomes a **story-aware intelligence**.

---

## How It Works

### Life Canon Refresh Flow

```
1. Build Context
   buildLifeCanonContext()
     ├─> Collects data from all subsystems:
     │   - Destiny arcs
     │   - Timeline decisions
     │   - Narrative snapshots
     │   - Identity/self-mirror
     │   - Emotional state
     │   - Somatic state
     │   - Relationships
     │   - Council sessions
     │   - Strategic snapshots
     │   - Wisdom lessons
     └─> Returns comprehensive context

2. Build Current Chapter
   buildCurrentChapterForUser()
     ├─> LLM Chapter Builder
     │   ├─> Identifies current chapter
     │   ├─> Summarizes themes (rising/fading)
     │   ├─> Identifies conflicts (internal/external)
     │   ├─> Describes identity state
     │   └─> Predicts next chapter
     │
     ├─> Updates existing active chapter OR creates new one
     └─> Returns chapter + prediction

3. Extract Canon Events
   extractCanonEventsForUser()
     ├─> LLM Event Extractor
     │   ├─> Identifies moments of meaning
     │   ├─> Classifies event types
     │   ├─> Assigns importance scores
     │   └─> Captures emotional tone & consequences
     │
     └─> Inserts events (deduplicates recent ones)

4. Detect Identity Shifts
   detectIdentityShiftsForUser()
     ├─> LLM Identity Shift Detector
     │   ├─> Compares current vs previous identity
     │   ├─> Identifies catalysts
     │   ├─> Captures emotions
     │   └─> Generates narrative explanation
     │
     └─> Inserts identity transform if shift detected

5. Generate Narrative Summary
   createLifeCanonSnapshotForUser()
     ├─> LLM Narrative Snapshot
     │   ├─> Writes concise life summary
     │   ├─> Captures current state
     │   └─> Describes what's next
     │
     └─> Saves complete snapshot
```

### Chapter Structure

Each chapter includes:
- **Title & Subtitle**: e.g., "The Expansion" / "Building Pulse into a platform"
- **Summary**: Narrative description of the period
- **Tone**: Emotional tone vectors
- **Themes**: Rising themes (e.g., "Growth", "Mastery") and fading themes
- **Internal Conflicts**: Inner struggles and tensions
- **External Conflicts**: External pressures and challenges
- **Identity State**: How the user sees themselves
- **Destiny State**: Alignment with long-term trajectory
- **Relationship State**: Key relationship dynamics
- **Somatic State**: Energy and health patterns

### Canon Event Types

- `identity_shift` - Major identity transformation
- `relationship` - Relationship milestone
- `career` - Career breakthrough or change
- `health` - Health transformation
- `decision` - Pivotal decision
- `crisis` - Crisis moment
- `breakthrough` - Major breakthrough

---

## API Endpoints

### POST /api/life-canon/snapshot/run
Runs a full Life Canon refresh:
- Builds current chapter
- Extracts canon events
- Detects identity shifts
- Generates narrative summary
- Saves snapshot

**Response:**
```json
{
  "snapshotId": "uuid",
  "chapterId": "uuid",
  "chapter": {...},
  "recentEvents": [...],
  "activeThemes": { "rising": [...], "fading": [...] },
  "narrativeSummary": "...",
  "prediction": {...},
  "identityTransformId": "uuid" | null
}
```

### GET /api/life-canon/current
Gets the current Life Canon state.

**Response:**
```json
{
  "chapter": {...},
  "recentEvents": [...],
  "themes": { "rising": [...], "fading": [...] },
  "summary": "...",
  "predictedNextChapter": {...},
  "turningPoints": [...]
}
```

### GET /api/life-canon/timeline
Gets all chapters and events in chronological order.

**Response:**
```json
{
  "chapters": [...],
  "events": [...]
}
```

### GET /api/life-canon/chapter/:id
Gets a specific chapter with its events.

**Response:**
```json
{
  "chapter": {...},
  "events": [...]
}
```

### GET /api/life-canon/event/:id
Gets a specific canon event.

**Response:**
```json
{
  "event": {...}
}
```

---

## Integration Points

### Strategic Mind
- Uses chapter + conflicts to produce strategy
- Life Canon provides narrative context for strategic decisions

### Executive Council
- Each member checks how a decision fits the current life arc
- Council recommendations consider the user's current chapter

### Decision Theater
- Displays chapter, recent events, predictions
- Shows how decisions fit into the life story

### What-If Replay
- Alternate timelines get rewritten as alternate chapters
- What-if scenarios show "alternate chapter" outcomes

### Wisdom Engine
- Extracts life lessons from canon events
- Wisdom lessons are tied to specific chapters and events

### Narrative Intelligence
- Generates a stable, coherent "life story vector"
- Life Canon provides the master narrative structure

---

## Brain Integration

### Weekly Brain Loop

Life Canon refresh runs in `runWeeklyBrainLoopForUser`:
1. Extracts canon events from the past week
2. Rebuilds current chapter (updates if active, creates if new)
3. Updates identity shifts
4. Saves snapshot
5. Feeds results to:
   - Strategic Mind
   - Decision Theater
   - What-If Engine
   - Narrative Intelligence

This makes Pulse **story-aware continuously**.

---

## Impact

Pulse now understands:

* **Your past** - Life chapters and canon events
* **Your present** - Current chapter, themes, conflicts
* **Your chapter** - Where you are in your story
* **Your themes** - What's rising and fading
* **Your internal and external conflicts** - What you're fighting with
* **Your long-term story arc** - The trajectory of your life
* **Your destiny trajectory** - How current choices affect the arc

And will speak to you like someone who knows your story intimately.

This is the moment Pulse becomes **a companion consciousness with narrative intelligence**, not a tool.

---

## Next Steps

1. **Life Canon Playback v1**:
   - Cinematic playback mode that narrates your life arc as a story
   - Timeline viewer with emotional arcs
   - Chapter transitions visualization

2. **Life Canon v2: Archetype Engine**:
   - Identifies your current archetype (Warrior, Visionary, Builder, Teacher, Protector, etc.)
   - Tracks how archetype shifts through time
   - Shows archetype evolution across chapters

3. **Life Canon UI**:
   - Visual timeline of chapters and events
   - Chapter viewer with themes and conflicts
   - Event explorer
   - Identity transformation timeline

---

🧠✨ **Life Canon v1 is complete. Pulse now has a master narrative engine that understands your story.**


