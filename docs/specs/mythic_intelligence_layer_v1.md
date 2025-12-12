# Mythic Intelligence Layer v1 - Mythic Brain for Pulse OS

## Implementation Status

✅ **COMPLETE** - All phases implemented:

### Database Schema
- ✅ 6 tables created (mythic_archetypes, life_chapters, mythic_sessions, deal_archetypes, deal_archetype_runs, user_mythic_profile)
- ✅ Seeded default life archetypes (Hero, Builder, Wanderer, Sage, Magician)
- ✅ Seeded default deal archetypes (Hunter, Fortress, Trickster, Visionary, Leviathan)

### Core Modules
- ✅ `lib/mythic/types.ts` - Type definitions
- ✅ `lib/mythic/story_extract.ts` - Life chapter extraction and profile refresh
- ✅ `lib/mythic/story_script.ts` - Voice script generation
- ✅ `lib/mythic/voice.ts` - TTS integration placeholder
- ✅ `lib/mythic/deal_extract.ts` - Deal signal extraction
- ✅ `lib/mythic/deal_classify.ts` - Deal archetype classification
- ✅ `lib/mythic/integration.ts` - Integration hooks for Identity, Destiny, Coaches

### API Endpoints
- ✅ `POST /api/mythic/life/refresh` - Regenerate life chapters + profile
- ✅ `GET /api/mythic/life/chapters` - Get life chapters
- ✅ `POST /api/mythic/session/start` - Start mythic session
- ✅ `POST /api/mythic/session/insight` - Save session insights
- ✅ `POST /api/mythic/deal/run` - Classify deal archetype
- ✅ `GET /api/mythic/deal/[dealId]` - Get deal archetype data

### Integration
- ✅ Brain Registry entry added (`mythic_intelligence_layer_v1`)

---

## Overview

The Mythic Intelligence Layer v1 is a cross-cutting system that:

1. **Turns life into mythic chapters** - Extracts life events, identifies chapter boundaries, maps to archetypes
2. **Provides voice-guided story sessions** - Generates personalized mythic narratives using various frameworks
3. **Classifies deals into archetypes** - Analyzes deal signals and maps to archetypal patterns
4. **Feeds other systems** - Integrates with Identity, Destiny, Power Dynamics, and Coaching

---

## Database Schema

### mythic_archetypes
Defines archetypes for life, deals, and power dynamics. Seeded with:
- **Life**: Hero, Builder, Wanderer, Sage, Magician
- **Deal**: Hunter, Fortress, Trickster, Visionary, Leviathan

### life_chapters
User's life story broken into chapters with:
- Timeframe (start/end dates)
- Dominant archetype
- Key events
- Emotional tone
- Lessons learned

### mythic_sessions
Voice-guided story sessions with:
- Session type (origin_story, dark_forest, rebirth, destiny_path, integration)
- Framework (heros_journey, samurai_path, stoic_trials, phoenix_cycle)
- Generated script and SSML
- Audio URL
- User insights

### deal_archetype_runs
Deal classifications with:
- Archetype assignment
- Confidence score
- Extracted signals
- Recommended strategy

### user_mythic_profile
Aggregated mythic state:
- Dominant life archetypes (with weights)
- Recurring motifs
- Current chapter
- Current phase (setup, departure, ordeal, return, integration)

---

## Core Functionality

### Story Extraction

`buildLifeChaptersForUser()`:
- Gathers events from memory, identity, emotion, deals
- Uses LLM to identify natural chapter boundaries
- Maps chapters to dominant archetypes
- Extracts emotional tone and lessons

`refreshUserMythicProfile()`:
- Analyzes chapters to identify recurring motifs
- Determines dominant archetypes with weights
- Identifies current phase in hero's journey
- Updates user mythic profile

### Story Script Generation

`generateMythicSessionScript()`:
- Pulls relevant chapters, identity, destiny data
- Uses framework-specific prompts (Hero's Journey, Samurai Path, etc.)
- Generates personalized second-person narrative
- Converts to SSML for voice synthesis
- Includes reflection markers `[[REFLECTION:...]]`

### Deal Classification

`extractDealSignals()`:
- Analyzes deal metadata (value, timeline, status)
- Extracts communication patterns (emails, meetings)
- Identifies signals: financial_scale, speed, bureaucracy, relationship_focus, etc.

`classifyDealArchetype()`:
- Uses LLM to map signals to archetype
- Returns confidence, signals used, recommended strategy
- Stores classification in `deal_archetype_runs`

### Integration Hooks

`syncMythicToIdentity()`:
- Updates identity snapshots with mythic roles
- Adds core motifs and current phase

`syncMythicToDestiny()`:
- Links destiny arcs to current mythic chapter
- Adds mythic phase context

`applyDealArchetypeToCoaches()`:
- Updates deal records with archetype data
- Coaches can read archetype and adjust playbook

---

## API Endpoints

### Life Story

#### POST /api/mythic/life/refresh
Regenerates life chapters and mythic profile.

**Response:**
```json
{
  "chapters": [...],
  "profile": {...}
}
```

#### GET /api/mythic/life/chapters
Returns all life chapters for user.

**Response:**
```json
{
  "chapters": [...]
}
```

### Story Sessions

#### POST /api/mythic/session/start
Starts a new mythic session.

**Body:**
```json
{
  "sessionType": "origin_story",
  "framework": "heros_journey",
  "focusChapterId": "optional"
}
```

**Response:**
```json
{
  "session": {
    "id": "uuid",
    "script_generated": "...",
    "ssml": "...",
    "audio_url": "..."
  }
}
```

#### POST /api/mythic/session/insight
Saves user insights from a session.

**Body:**
```json
{
  "sessionId": "uuid",
  "prompt": "What did you learn?",
  "response": "user text",
  "tags": ["identity", "fear"]
}
```

### Deal Archetype Lens

#### POST /api/mythic/deal/run
Classifies a deal into an archetype.

**Body:**
```json
{
  "dealId": "uuid"
}
```

**Response:**
```json
{
  "run": {
    "archetype_id": "uuid",
    "confidence": 0.85,
    "signals": {...},
    "recommended_strategy": "..."
  }
}
```

#### GET /api/mythic/deal/[dealId]
Returns deal archetype data.

**Response:**
```json
{
  "latestRun": {...},
  "history": [...],
  "recommendedStrategy": "..."
}
```

---

## Next Steps

### Frontend UI

#### `/app/mythic/page.tsx` - Mythic Hub
- Current Chapter Card
- Mythic Timeline (life chapters)
- Quick Actions (start session, run deal lens, update destiny)

#### `/app/mythic/sessions/[id]/page.tsx` - Session Player
- Audio player
- Script transcript
- Reflection text areas
- "Send insights to Identity Engine" button

#### Deal Page Widget
- `components/mythic/DealArchetypeBadge.tsx`
- Shows archetype, confidence, strategies
- "Re-run Archetype Scan" button

#### Dashboard Widget
- "Mythic Overview" widget
- Current chapter, archetype mix, narrator sentence

### TTS Integration
- Complete `synthesizeMythicSessionAudio()` implementation
- Integrate with ElevenLabs, OpenAI TTS, or other service
- Store audio in Supabase Storage or S3

### Enhanced Classifications
- Add more nuanced signal extraction from communication
- Improve archetype classification accuracy
- Add power dynamics archetypes

---

## Impact

Pulse now has a **Mythic Brain** that:

1. **Narrativizes Life** - Turns raw events into meaningful chapters
2. **Guides Reflection** - Voice sessions help users see their story
3. **Classifies Deals** - Understands deal dynamics through archetypes
4. **Feeds Intelligence** - Enriches Identity, Destiny, and Coaching with mythic context

This is the moment Pulse becomes a **mythic intelligence system** that helps users understand their life as a story and make decisions through that lens.

🧠✨


