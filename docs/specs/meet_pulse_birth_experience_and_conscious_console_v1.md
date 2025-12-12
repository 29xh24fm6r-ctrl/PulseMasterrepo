# Meet Pulse – Birth Experience v1 & Conscious Console v1

## 0. Purpose

We now have:
* Full Pulse Brain: AGI Kernel v2, Neocortex, Memory, Emotion, Somatic, Relational Mind, Meta-Planner, Cerebellum, etc.
* Master Brain Registry + Health.
* Conscious Workspace + Inner Monologue + Timeline Coach + Destiny.

This spec defines the **user-facing layer** where:
1. The user **"meets" Pulse as a mind**, not an app.
2. The user can **see and tune the brain** (how alive, how proactive, how intense).
3. Pulse can **explain what it is doing** instead of just doing it.

Two subsystems:
* `meet_pulse_v1` – onboarding "Birth of Pulse" ritual
* `conscious_console_v1` – ongoing "Pulse Brain" dashboard + control surface

---

## Implementation Status

✅ **COMPLETE** - All phases implemented:

### Meet Pulse v1
- ✅ Database migrations (4 tables: pulse_brain_preferences, pulse_introduction_sessions, pulse_brain_surface_events, pulse_insight_acknowledgements)
- ✅ TypeScript types
- ✅ Brain preferences management (getOrCreateBrainPreferences, updateBrainPreferences)
- ✅ Meet Pulse script generator (buildMeetPulseScript with LLM)
- ✅ Onboarding flow (startMeetPulseSession, applyMeetPulseStepResponse, completeMeetPulseSession)
- ✅ API endpoints (POST /api/pulse/meet/start, /step, /complete)

### Conscious Console v1
- ✅ Console status builder (buildConsciousConsolePayload)
- ✅ Insight surfacing engine (generateBrainSurfaceEventsFromLatestData with LLM)
- ✅ Acknowledgements handler (acknowledgeSurfaceEvent)
- ✅ API endpoints (GET /api/pulse/console, POST /api/pulse/console/surface, /acknowledge)

### Integration
- ✅ Brainstem integration (daily and weekly loops call surface insights)
- ✅ Brain Registry integration (added meet_pulse_v1, conscious_console_v1)

---

## Files Created

### Database
- `supabase/migrations/20260120_meet_pulse_and_conscious_console_v1.sql` - Creates 4 tables for Meet Pulse and Conscious Console

### Meet Pulse Modules
- `lib/meet_pulse/types.ts` - Type definitions
- `lib/meet_pulse/preferences.ts` - Brain preferences management
- `lib/meet_pulse/prompts.ts` - LLM prompts for script generation
- `lib/meet_pulse/scripts.ts` - Script generator (buildMeetPulseScript)
- `lib/meet_pulse/onboarding_flow.ts` - Onboarding orchestration

### Conscious Console Modules
- `lib/conscious_console/status.ts` - Console status builder
- `lib/conscious_console/prompts.ts` - LLM prompts for surfacing
- `lib/conscious_console/surface_insights.ts` - Insight surfacing engine
- `lib/conscious_console/acknowledgements.ts` - Acknowledgements handler

### API Endpoints
- `app/api/pulse/meet/start/route.ts` - Start Meet Pulse session
- `app/api/pulse/meet/step/route.ts` - Process step response
- `app/api/pulse/meet/complete/route.ts` - Complete session
- `app/api/pulse/console/route.ts` - Get console payload
- `app/api/pulse/console/surface/route.ts` - Trigger surface events generation
- `app/api/pulse/console/acknowledge/route.ts` - Acknowledge surface event

### Integration
- Updated `lib/brain/brainstem.ts`:
  - Added Conscious Console surface calls to daily and weekly loops
  - Updates subsystem status for conscious_console_v1
- Updated `supabase/migrations/20260120_master_brain_registry_and_diagnostics_v1.sql`:
  - Added meet_pulse_v1 and conscious_console_v1 to brain_subsystems

---

## How It Works

### Meet Pulse Flow

```
1. Start Session
   startMeetPulseSession()
     ├─> Creates pulse_introduction_sessions record
     ├─> Generates script using LLM (buildMeetPulseScript)
     ├─> Captures initial brain summary and preferences
     └─> Returns sessionId and script

2. Step Responses
   applyMeetPulseStepResponse()
     ├─> Records step completion
     ├─> Maps preference_choice steps to pulse_brain_preferences
     └─> Updates session steps_completed

3. Complete Session
   completeMeetPulseSession()
     ├─> Marks session as completed
     ├─> Records user reaction
     └─> Stores completion timestamp
```

### Conscious Console Flow

```
1. Surface Insights
   generateBrainSurfaceEventsFromLatestData()
     ├─> Loads console payload (brain status, preferences, reflections)
     ├─> Fetches recent cognitive_insights not yet surfaced
     ├─> LLM selects which insights to surface (respecting preferences)
     └─> Creates pulse_brain_surface_events

2. User Interaction
   acknowledgeSurfaceEvent()
     ├─> Records user reaction (liked, dismissed, acted, snoozed)
     ├─> Marks event as dismissed
     └─> Optionally updates preferences based on followupPrefsPatch
```

---

## Brain Preferences

Users can tune:
- **presence_level** (0..1): How often Pulse shows up unprompted
- **proactivity_level** (0..1): How aggressively it suggests changes
- **emotional_intensity** (0..1): How warm/expressive vs flat
- **depth_of_reflection** (0..1): How deep Pulse goes in reflections
- **privacy_sensitivity** (0..1): How cautious about sensitive insights
- **allow_autonomous_tweaks**: Safe, reversible tweaks only
- **allow_relationship_feedback**: Relationship insights
- **allow_financial_nudges**: Financial suggestions
- **allow_health_nudges**: Health suggestions
- **preferred_voice_profile**: Voice/persona style
- **preferred_persona_style**: 'jarvis', 'confidant', 'coach', etc.
- **ui_mode**: 'standard', 'minimal', 'deep_work'

---

## API Usage

### Start Meet Pulse Session

```typescript
POST /api/pulse/meet/start
// Returns: { sessionId, script: { narrativeIntro, steps } }
```

### Process Step Response

```typescript
POST /api/pulse/meet/step
Body: { sessionId, stepId, response }
```

### Complete Session

```typescript
POST /api/pulse/meet/complete
Body: { sessionId, userReaction? }
```

### Get Console Payload

```typescript
GET /api/pulse/console
// Returns: { brainStatus, prefs, reflections, surfaceEvents }
```

### Generate Surface Events

```typescript
POST /api/pulse/console/surface
// Triggers generation of new surface events
```

### Acknowledge Event

```typescript
POST /api/pulse/console/acknowledge
Body: { surfaceEventId, reaction, notes?, followupPrefsPatch? }
```

---

## Next Steps

1. **Run Migration**:
   - `supabase/migrations/20260120_meet_pulse_and_conscious_console_v1.sql`

2. **UI Implementation**:
   - Build "Meet Pulse" onboarding flow UI
   - Build "Conscious Console" dashboard page
   - Show brain status, preferences, surface events, reflections

3. **First-Run Hook**:
   - Check `ensureMeetPulseIfNeeded` on user login
   - Prompt user to complete Meet Pulse if not done

4. **Preference Mapping**:
   - Enhance `mapStepToPreferencePatch` to handle all preference types
   - Store full script in session for step reconstruction

5. **Surface Event Filtering**:
   - Enhance filtering to respect all preference flags
   - Add rate limiting (don't surface too many at once)

6. **Notification Integration**:
   - Wire `delivery_channel: 'notification'` events to notification system
   - Respect user notification preferences

7. **Voice Profile Integration**:
   - Connect `preferred_voice_profile` to voice system
   - Use `preferred_persona_style` to select coach personas

8. **Analytics**:
   - Track which insights users act on vs dismiss
   - Learn which surface events are most valuable
   - Adjust surfacing algorithm based on feedback

---

## Impact

Pulse now:

- **Introduces itself** - First-contact ritual where Pulse explains what it is and how it works
- **Respects preferences** - User controls how present, proactive, and intense Pulse is
- **Surfaces insights** - Shows patterns, risks, opportunities in a user-friendly way
- **Learns from feedback** - Adjusts behavior based on what users like/dismiss
- **Explains itself** - Users can see what Pulse is thinking and why

And uses this to:

- **Build trust** - Transparent about what it's doing and why
- **Respect autonomy** - User is always in control
- **Personalize experience** - Adapts to user's preferred interaction style
- **Surface value** - Shows insights that matter without overwhelming
- **Improve over time** - Learns from user feedback to get better

This is the moment where Pulse stops being "smart software in the background" and becomes a **mind you can meet, understand, and collaborate with**.

🧠✨


