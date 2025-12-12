# Mythic Coach v1 – Training Your Inner Archetypes

## 0. Purpose

Mythic Coach v1 turns archetypes from "cool insight" into **actionable training plans**.

It uses:
* **Archetype Engine v2** - currentMix, rising/fading, healthy vs shadow, suppressed archetypes
* **Life Canon** - current chapter, themes, conflicts, canon events
* **Strategic Mind** - strategic priorities
* **Career/Life Dojo + Missions/XP** - daily/weekly missions, streaks, XP

To create:
1. **Mythic Training Focus** – which archetypes to nurture, stabilize, or cool down
2. **Archetype Training Programs** – 30/60/90 day "arcs" for key archetypes
3. **Daily/Weekly Missions** – small, specific actions tied to archetype growth
4. **Reflection & Feedback** – how well archetypes showed up this week (healthy vs shadow)

Subsystem ID: `mythic_coach_v1`.

---

## Implementation Status

✅ **COMPLETE** - All phases implemented:

### Mythic Coach v1
- ✅ Database migrations (4 tables: mythic_training_plans, mythic_training_focus, mythic_training_missions, mythic_training_reflections)
- ✅ TypeScript types
- ✅ LLM prompts (Focus, Plan, Mission, Reflection)
- ✅ Focus builder (buildMythicTrainingFocus)
- ✅ Plan builder (createMythicPlanForTarget)
- ✅ Mission builder (generateWeeklyMissionsForPlan)
- ✅ Reflection engine (runMythicReflectionForWeek)
- ✅ API endpoints (5 endpoints)
- ✅ Brain loop integration (weekly)
- ✅ Brain Registry integration (mythic_coach_v1)

---

## Files Created

### Database
- `supabase/migrations/20260120_mythic_coach_v1.sql` - Creates 4 tables for Mythic Coach

### Mythic Coach Modules
- `lib/mythic_coach/v1/types.ts` - Type definitions
- `lib/mythic_coach/v1/prompts.ts` - LLM prompts
- `lib/mythic_coach/v1/focus_builder.ts` - Training focus builder
- `lib/mythic_coach/v1/plan_builder.ts` - Training plan builder
- `lib/mythic_coach/v1/mission_builder.ts` - Mission generator
- `lib/mythic_coach/v1/reflection_engine.ts` - Weekly reflection engine

### API Routes
- `app/api/mythic-coach/focus/run/route.ts` - Run focus builder
- `app/api/mythic-coach/plan/create/route.ts` - Create training plan
- `app/api/mythic-coach/missions/generate/route.ts` - Generate missions
- `app/api/mythic-coach/reflection/run/route.ts` - Run reflection
- `app/api/mythic-coach/dashboard/route.ts` - Dashboard data

### Integration
- Updated `lib/brain/brainstem.ts`:
  - Added Mythic Coach weekly refresh to `runWeeklyBrainLoopForUser`
  - Includes focus update, plan creation, mission generation, and reflections
- Updated `supabase/migrations/20260120_master_brain_registry_and_diagnostics_v1.sql`:
  - Added `mythic_coach_v1` to `brain_subsystems`

---

## How It Works

### Weekly Brain Loop Flow

```
1. Archetype Snapshot
   runArchetypeSnapshotForUser()
     └─> Updates archetype mix, rising/fading

2. Mythic Focus Update (if needed)
   buildMythicTrainingFocus()
     ├─> Analyzes current chapter, archetypes, strategic priorities
     ├─> Identifies primary targets (1-3 archetypes)
     ├─> Identifies secondary targets (1-3 archetypes)
     └─> Generates rationale

3. Ensure Active Plans
   createMythicPlanForTarget()
     ├─> For each primary target without active plan:
     │   ├─> Creates 90-day training plan
     │   ├─> Sets goals and constraints
     │   └─> Marks as active
     └─> Links to archetype and chapter

4. Generate Weekly Missions
   generateWeeklyMissionsForPlan()
     ├─> For each active plan:
     │   ├─> Generates 7 days of missions
     │   ├─> Staggers due dates across week
     │   ├─> Assigns XP values
     │   └─> Tags by context (work, family, health, inner_work)
     └─> Creates mission records

5. Weekly Reflections
   runMythicReflectionForWeek()
     ├─> For each active archetype:
     │   ├─> Reviews completed missions
     │   ├─> Analyzes canon events
     │   ├─> Rates archetype expression (coach_rating)
     │   ├─> Identifies wins and challenges
     │   └─> Suggests adjustments
     └─> Saves reflection records
```

### Training Focus

Primary targets (1-3 archetypes):
- **Grow** - Develop this archetype more (green accent)
- **Stabilize** - Keep it strong & healthy, avoid shadow (blue)
- **Cool** - Reduce overexpression, especially shadow (amber/red)

Secondary targets (1-3 supporting archetypes):
- Supporting archetypes that complement primary training

### Training Plans

Each plan includes:
- **plan_label** - e.g., "Builder 90-Day Foundation"
- **description** - What this plan aims to achieve
- **goals** - Specific development objectives
- **constraints** - Boundaries (family time, health limits)
- **duration_days** - 30, 60, or 90 days
- **intensity** - light, moderate, or intense
- **progress** - Tracking (percentComplete, startedAt, expectedEnd)

### Missions

Each mission includes:
- **title** - Clear action statement
- **description** - Context and details
- **cadence** - daily, weekly, once, custom
- **estimated_effort_minutes** - Time required
- **xp_value** - XP reward (default 10)
- **tags** - Context tags (work, family, health, inner_work)
- **due_date** - When it's due
- **status** - pending, completed, skipped, expired

### Reflections

Each reflection includes:
- **coach_rating** - 0..1 how well archetype was expressed
- **wins** - Concrete positive examples
- **challenges** - Shadow patterns or missed opportunities
- **adjustments** - How to tweak missions/focus next period

---

## API Endpoints

### POST /api/mythic-coach/focus/run
Triggers training focus update.

**Response:**
```json
{
  "focusId": "uuid",
  "primaryTargets": [
    { "archetypeId": "builder", "mode": "grow", "reason": "..." }
  ],
  "secondaryTargets": [...],
  "rationale": "..."
}
```

### POST /api/mythic-coach/plan/create
Creates a new training plan.

**Body:**
```json
{
  "archetypeId": "builder",
  "mode": "grow",
  "durationDays": 90
}
```

**Response:**
```json
{
  "planId": "uuid"
}
```

### POST /api/mythic-coach/missions/generate
Generates weekly missions for a plan.

**Body:**
```json
{
  "planId": "uuid",
  "weekStart": "2025-12-08"
}
```

**Response:**
```json
{
  "missions": [...]
}
```

### POST /api/mythic-coach/reflection/run
Runs weekly reflection for an archetype.

**Body:**
```json
{
  "archetypeId": "builder",
  "periodStart": "2025-12-01",
  "periodEnd": "2025-12-07"
}
```

**Response:**
```json
{
  "coachRating": 0.75,
  "wins": [...],
  "challenges": [...],
  "adjustments": [...]
}
```

### GET /api/mythic-coach/dashboard
Returns dashboard overview.

**Response:**
```json
{
  "focus": { ...latest mythic_training_focus row },
  "activePlans": [ ...mythic_training_plans ],
  "upcomingMissions": [ ...mythic_training_missions next 7 days ],
  "recentReflections": [ ...mythic_training_reflections last 4 ]
}
```

---

## Integration Points

### Archetype Engine v2
- Uses archetype snapshots to determine focus
- Tracks archetype evolution through training

### Life Canon
- Links training focus to current chapter
- Uses canon events for reflection context

### Strategic Mind
- Considers strategic priorities in focus building
- Aligns training with strategic goals

### XP/Missions System (Future)
- Missions should grant XP
- Can integrate with existing mission/XP engine
- Tag-based XP or separate "Mythic XP" type

---

## Brain Integration

### Weekly Brain Loop

Mythic Coach runs in `runWeeklyBrainLoopForUser`:

1. **Focus Update** (if last focus > 7 days old):
   - Builds new training focus
   - Ensures active plans for primary targets

2. **Mission Generation**:
   - Generates missions for next week for all active plans

3. **Weekly Reflections**:
   - Runs reflections for last week for each active archetype

This makes archetype training **self-maintaining**.

---

## Next Steps

### Frontend UI
- `/app/mythic-coach/page.tsx` - Main dashboard
  - Current focus panel
  - Active training plans
  - Missions stream
  - Weekly reflection CTA
- `/app/mythic-coach/plan/[planId]/page.tsx` - Plan details
  - Plan info
  - Missions list
  - Archetype view

### Components
- `MythicFocusPanel` - Shows primary/secondary targets
- `MythicPlanCard` - Plan summary card
- `MythicMissionList` - Upcoming missions
- `MythicReflectionSummary` - Reflection results

### Enhancements
- **Mythic Coach Voice Persona** - Special coach voice for mythic work
- **Mythic Dojo** - Gamified view with belts/tiers
- **XP Integration** - Connect missions to XP system
- **Mission Completion** - UI for completing/skipping missions

---

## Impact

Pulse can now literally say:

> "For this chapter, we're training **Builder + King**, cooling down **Shadow Warrior**.
> Here are today's 3 micro-missions to move you toward that version of you."

Mythic Coach v1 transforms archetypes from insights into **actionable training programs** that:
- Set clear focus on which archetypes to develop
- Create structured training plans
- Generate daily/weekly missions
- Provide weekly feedback and adjustments

This is the moment Pulse becomes a **mythic training partner** that helps you actively shape who you're becoming.

🧙‍♂️🏋️‍♂️✨


