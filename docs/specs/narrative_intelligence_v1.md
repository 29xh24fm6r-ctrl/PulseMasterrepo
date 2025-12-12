# Pulse Narrative Intelligence Engine v1 – Spec

## 0. Goal

Give Pulse a **Narrative Intelligence Engine** that:

* Tracks your **life chapters**, **themes**, **major characters**, and **turning points**.
* Builds **narrative snapshots** ("Where am I in my story right now?").
* Feeds this into:
  * Conscious Workspace (what matters this chapter)
  * Prefrontal planning (plans that match your current arc)
  * Coaches (advice that fits your story, not just your tasks)
  * Desire Modeling (what you're really moving toward)
  * Behavioral Prediction (likely next moves & risks)

This implements the `narrative_intelligence` subsystem in the **Brain Registry** and sits mostly in:

* **Hippocampus** (memory / story integration)
* **Third Brain** (long-form notes, reflections, journals)
* **Neocortex** (pattern extraction across time)
* **Global Workspace & Prefrontal** (short-term focus in context of long-term story)

---

## Implementation Status

✅ **COMPLETE** - All phases implemented:

- ✅ Database migrations (5 tables: life_chapters, life_events, life_themes, identity_arcs, narrative_snapshots)
- ✅ TypeScript types
- ✅ Event extraction engine (life_events from brain_events, deals, goals)
- ✅ Chapter segmentation engine
- ✅ Theme detection engine
- ✅ Identity arcs engine
- ✅ Weekly narrative snapshots
- ✅ API endpoints (current, chapters, themes, snapshots)
- ✅ Brainstem weekly loop integration
- ✅ Workspace integration (narrative context in workspace builder)

---

## Files Created

### Database
- `supabase/migrations/20260120_narrative_intelligence_v1.sql`

### Core Modules
- `lib/narrative/types.ts` - Type definitions
- `lib/narrative/events.ts` - Extract narrative events from brain_events, deals, goals
- `lib/narrative/chapters.ts` - Segment life into chapters
- `lib/narrative/themes.ts` - Detect recurring themes
- `lib/narrative/identity.ts` - Create identity arcs
- `lib/narrative/snapshots.ts` - Weekly narrative snapshots
- `lib/narrative/weekly.ts` - Weekly loop orchestrator
- `lib/narrative/context.ts` - Get current narrative context

### API Routes
- `app/api/narrative/current/route.ts` - Get current narrative context
- `app/api/narrative/chapters/route.ts` - List chapters
- `app/api/narrative/themes/route.ts` - List themes
- `app/api/narrative/snapshots/route.ts` - List snapshots
- `app/api/brain/weekly-loop/route.ts` - Manual weekly loop trigger

### Integration
- Updated `lib/brain/brainstem.ts` - Added `runWeeklyBrainLoopForUser()`
- Updated `lib/workspace/engine.ts` - Includes narrative context in workspace builder

---

## How It Works

### 1. Weekly Narrative Loop

```
runWeeklyNarrativeLoopForUser()
  ├─> refreshLifeEventsForUser()      // Extract narrative events from recent activity
  ├─> refreshLifeChaptersForUser()     // Segment into chapters
  ├─> refreshLifeThemesForUser()       // Detect themes
  ├─> refreshIdentityArcsForUser()     // Create identity arcs
  └─> createWeeklyNarrativeSnapshotForUser() // Weekly snapshot
```

### 2. Event Extraction

- **Sources**: brain_events, deals (won/closed), goals (completed)
- **LLM Analysis**: Identifies story-level events (not every task)
- **Output**: life_events table with impact, emotional valence, tags

### 3. Chapter Segmentation

- **Input**: All life_events + emotion_state_daily
- **LLM Analysis**: Segments into 2-10 chapters
- **Output**: life_chapters with title, tagline, themes, roles, summary
- **Status**: One 'active' chapter, others 'past' or 'planned'

### 4. Theme Detection

- **Input**: life_events + life_chapters
- **LLM Analysis**: Identifies 3-12 recurring themes
- **Output**: life_themes with key, name, description, strength, domains

### 5. Identity Arcs

- **Input**: Identity profile, themes, active goals
- **LLM Analysis**: Creates 2-6 identity arcs (e.g., "From solo hustler to system builder")
- **Output**: identity_arcs with progress, associated roles, driving values

### 6. Narrative Snapshots

- **Input**: Current chapter, themes, arcs, recent events
- **LLM Analysis**: Creates weekly snapshot with tensions, opportunities, summary
- **Output**: narrative_snapshots with logline, tensions, opportunities

---

## API Usage

### Get Current Narrative Context
```typescript
GET /api/narrative/current
// Returns: { chapter, snapshot, themes, arcs }
```

### List Chapters
```typescript
GET /api/narrative/chapters
// Returns: { chapters: [...] }
```

### List Themes
```typescript
GET /api/narrative/themes
// Returns: { themes: [...] }
```

### List Snapshots
```typescript
GET /api/narrative/snapshots?limit=10
// Returns: { snapshots: [...] }
```

### Manual Weekly Loop (Dev)
```typescript
POST /api/brain/weekly-loop
Body: { weekEnd: "2026-01-20" } // optional
```

---

## Integration Points

### Workspace Integration

The workspace builder now receives narrative context:

```typescript
{
  chapter: { title, tagline, dominantThemes, primaryRoles },
  activeThemes: [...],
  activeArcs: [...],
  tensions: [...]
}
```

The LLM prompt includes:
- "Consider the current life chapter and active themes when choosing the theme"
- "Favor plans and threads that move identity arcs forward and resolve current tensions"

### Coach Integration (Future)

Coaches can query `/api/narrative/current` to:
- Reference current chapter in advice
- Address tensions from snapshots
- Align suggestions with identity arcs
- Use themes to provide context-aware guidance

---

## Subsystem Status

`narrative_intelligence` = `partial` (v1) in Brain Registry

---

## Next Steps

1. **Run Migration**: `supabase/migrations/20260120_narrative_intelligence_v1.sql`

2. **Wire Weekly Loop**: 
   - Add cron job or scheduled task to call `runWeeklyBrainLoopForUser()` weekly
   - Or use `/api/brain/weekly-loop` endpoint for manual triggers

3. **Coach Integration**:
   - Update coach prompts to use narrative context
   - Reference chapters, themes, tensions in advice

4. **UI Integration**:
   - Show current chapter in dashboard
   - Display themes and arcs
   - Show narrative snapshots

5. **Event Sources**:
   - Wire more event sources (journal entries, major calendar events)
   - Improve event extraction with more context

---

## Impact

Pulse now has:

- **A sense of time** - Knows your life chapters
- **A sense of story** - Understands themes and arcs
- **A sense of who you're becoming** - Tracks identity transformation

This is the foundation for:
- **Desire Modeling** - What Future You really wants
- **Behavioral Prediction** - Likely next moves based on story arc
- **Context-Aware Coaching** - Advice that fits your story, not just your tasks

After Narrative v1, Pulse officially knows your story. 📖🧠


