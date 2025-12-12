# Mythic Coach Engine v1 - Archetypal, Story-Driven Coach

## Implementation Status

✅ **COMPLETE** - All phases implemented:

### Database Schema
- ✅ 3 tables created (mythic_playbooks, mythic_coach_sessions, user_mythic_coach_settings)
- ✅ Seeded 5 default playbooks (Hunter Facing Fortress, Reforging in Dark Forest, Phoenix Reset, Builder's Brick, Samurai Cut Through Noise)

### Core Modules
- ✅ `lib/mythic/coach/types.ts` - Type definitions
- ✅ `lib/mythic/coach/context.ts` - Context builder
- ✅ `lib/mythic/coach/playbook_engine.ts` - Playbook selection
- ✅ `lib/mythic/coach/settings.ts` - Settings management
- ✅ `lib/mythic/coach/generate.ts` - Response generator
- ✅ `lib/mythic/coach/log.ts` - Session logging

### API Endpoints
- ✅ `POST /api/mythic/coach/message` - Generic coach interaction
- ✅ `GET /api/mythic/coach/settings` - Get settings
- ✅ `POST /api/mythic/coach/settings` - Update settings
- ✅ `POST /api/mythic/coach/daily-ritual` - Daily ritual check-in

### Integration
- ✅ Brain Registry entry added (`mythic_coach_engine_v1`)

---

## Overview

Mythic Coach Engine v1 is a cross-cutting coach that:
- Speaks in **mythic language** tailored to current life chapter, archetypes, and deals
- Suggests **archetypal plays** for deals, habits, and decisions
- Runs short **micro-sessions** that reframe situations as part of the heroic arc
- Does **not** replace other coaches - it overlays them with mythic framing

---

## Database Schema

### mythic_playbooks
Reusable archetypal plays keyed by archetype + context:
- Context: deal, habit, identity, relationship, crisis
- Triggers: pattern tags (delay, avoidance, overwhelm, etc.)
- Actions: structured steps
- Example language: snippets for coach voice

**Seeded Playbooks:**
1. **Hunter Facing Fortress** - Fast-moving deal meets slow organization
2. **Reforging in the Dark Forest** - Overwhelmed/stuck phase
3. **Phoenix Reset** - Habit relapse recovery
4. **Builder's Brick** - Steady compound action when impatient
5. **Samurai Cut Through Noise** - Focus session when distracted

### mythic_coach_sessions
Individual coaching interactions:
- Mode: ad_hoc, daily_ritual, deal_review, crisis
- Source: user_opening_app, weekly_planner, deal_page, emotion_os
- Links to life chapter, archetype, deal
- Stores response, used playbooks, insights

### user_mythic_coach_settings
User-level configuration:
- Intensity: soft, medium, warrior
- Tone: grounded, epic, playful
- Session length: micro, short, deep
- Preferred framework: heros_journey, samurai_path, stoic_trials
- Enabled flag

---

## Core Functionality

### Context Building

`buildMythicContext()`:
- Pulls user mythic profile
- Gets current life chapter
- Fetches active deals and archetype runs
- Gets emotion snapshot
- Retrieves identity traits and active goals

### Playbook Selection

`selectPlaybooks()`:
- Filters by context (deal, habit, weekly_plan, crisis)
- Matches dominant archetypes
- Scores by trigger overlap
- Returns top 2-3 playbooks

### Response Generation

`generateMythicCoachResponse()`:
1. Builds mythic context
2. Selects appropriate playbooks
3. Gets user settings (intensity, tone, length)
4. Generates LLM response with:
   - Current chapter info
   - Dominant archetypes
   - Deal archetype (if present)
   - Selected playbooks as inspiration
   - Tone/intensity instructions
5. Returns response + metadata

**Response Guidelines:**
- 1-3 short paragraphs max
- 2-4 concrete moves as bullets
- Optional "hero line" reframing
- Tied to current story chapter
- References next clear action

### Session Logging

`logMythicCoachSession()`:
- Persists session to database
- Links to life chapter, archetype, deal
- Stores used playbooks
- Captures insights

---

## API Endpoints

### POST /api/mythic/coach/message
Generic "talk to Mythic Coach" entry point.

**Body:**
```json
{
  "mode": "ad_hoc",
  "userMessage": "I feel stuck on this refinance and I keep avoiding it.",
  "dealId": "optional-uuid"
}
```

**Response:**
```json
{
  "response": "...",
  "metadata": {
    "lifeChapterId": "...",
    "dominantArchetypeId": "...",
    "dealArchetypeRunId": "...",
    "usedPlaybookIds": [...]
  }
}
```

### GET /api/mythic/coach/settings
Returns user settings.

### POST /api/mythic/coach/settings
Updates settings.

**Body:**
```json
{
  "intensity": "warrior",
  "tone": "grounded",
  "sessionLength": "short",
  "preferredFramework": "samurai_path"
}
```

### POST /api/mythic/coach/daily-ritual
Daily ritual check-in for Autopilot/Weekly Planner.

**Body:**
```json
{
  "source": "weekly_planner"
}
```

**Response:**
```json
{
  "response": "...",
  "metadata": {...}
}
```

---

## Integration Points

### Existing Coaches
- Sales Coach / Career Coach can optionally pull mythic context
- Add one-line mythic framing to advice
- Mythic Coach is a separate persona with its own voice profile

### Weekly Planner / Morning Briefing
- At start of day, call `/api/mythic/coach/daily-ritual`
- Insert response as "Narrative Frame for Today"
- One line + 2-3 suggested actions

### Autopilot & Missions
- Tag tasks/missions with mythic labels ("Forge", "Scout", "Heal")
- Mythic Coach uses these tags to talk about "today's quests"

### Emotion OS
- When prolonged negative pattern detected
- Suggest: "Talk to Mythic Coach about this phase"
- Calls with mode=`crisis`

---

## Next Steps

### Frontend UI

#### `/app/mythic/coach/page.tsx` - Mythic Coach Pane
- Chat-like area for conversations
- Header: current chapter + archetype
- Controls: Intensity toggle, Tone dropdown, Framework pill

#### Dashboard Widget
- "Mythic Coach" widget
- Button: "Ask: What's my next move in this chapter?"
- Opens `/mythic/coach` with prefilled question

#### Deal Page Integration
- Button: "Ask Mythic Coach about this deal"
- Calls API with mode=`deal_review` & dealId

#### Settings UI
- On `/settings/coach`
- Toggle: "Enable Mythic Coach"
- Intensity, Tone, Framework selections

---

## Impact

Pulse now has a **Mythic Coach** that:

1. **Speaks in Mythic Language** - Tailored to current chapter and archetypes
2. **Suggests Archetypal Plays** - Context-aware strategies
3. **Reframes Situations** - Sees life as a heroic arc
4. **Overlays Other Coaches** - Adds mythic framing without replacing functionality

This is the moment Pulse becomes a **mythic coaching system** that helps users understand their life as a story and make decisions through that lens.

🧙‍♂️✨


