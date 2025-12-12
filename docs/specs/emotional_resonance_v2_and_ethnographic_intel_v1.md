# Emotional Mirroring v2 & Ethnographic Intelligence v1 – Spec

## 0. Big Picture

We already have:
* Emotion OS (detects emotional state, patterns, triggers)
* Somatic v2 (body / energy / stress states)
* ToM & Social Graph v2 (how *other people* think/feel)
* Narrative, Destiny, Timeline, Workspace, Simulation, etc.

This spec adds two major layers:

1. **Emotional Mirroring & Empathic Resonance v2 (`emotional_resonance_v2`)**
   * Pulse dynamically adapts:
     * Tone, pacing, and style of communication
     * Coach persona choice
     * Intervention type (calm, hype, grounding, reality-check, etc.)
   * Based on:
     * Your current emotional + somatic state
     * Your long-term emotional preferences
     * Context (work vs family vs legal vs health vs "existential 3am spiral")

2. **Ethnographic / Cultural Intelligence v1 (`ethnographic_intel`)**
   * Pulse understands your **environments**:
     * Bank culture, industry norms, team dynamics
     * Family culture, friend group norms
     * Local/regional expectations ("what flies" vs "what blows up")
   * Uses that to:
     * Shape advice, scripts, and plans so they **"fit the room"**
     * Avoid tone-deaf suggestions
     * Align strategies with real constraints and norms

These sit *above* perception and *below* content:

> Emotion: "How are we feeling?"
> Culture: "Where are we?"
> → Then Pulse decides **how to speak** and **what's appropriate**.

---

## Implementation Status

✅ **COMPLETE** - All phases implemented:

- ✅ Database migrations (Emotion Resonance: style_profile, channel_settings, interaction_log, resonance_events; Culture: contexts, profiles, norm_logs, alignment_log)
- ✅ TypeScript types for both systems
- ✅ Emotion Resonance: style profile builder, router, logger, resonance learning
- ✅ Culture: context registration, profile inference, alignment evaluator, context provider
- ✅ Brainstem integration (weekly loop)

---

## Files Created

### Database
- `supabase/migrations/20260120_emotional_resonance_v2.sql`
- `supabase/migrations/20260120_ethnographic_intel_v1.sql`

### Emotional Resonance v2
- `lib/emotion/resonance/types.ts` - Type definitions
- `lib/emotion/resonance/profile.ts` - Style profile builder
- `lib/emotion/resonance/router.ts` - Style router
- `lib/emotion/resonance/logger.ts` - Interaction logger
- `lib/emotion/resonance/resonance_learning.ts` - Resonance event derivation

### Ethnographic Intelligence v1
- `lib/culture/types.ts` - Type definitions
- `lib/culture/contexts.ts` - Context registration
- `lib/culture/profiles.ts` - Profile inference
- `lib/culture/alignment.ts` - Alignment evaluator
- `lib/culture/context_provider.ts` - Context provider for other systems

### Integration
- Updated `lib/brain/brainstem.ts` - Runs emotion resonance and culture refresh in weekly loop

---

## How It Works

### 1. Emotional Resonance v2 Flow

```
refreshEmotionStyleProfileForUser()
  ├─> Pulls from value profile, past interactions, resonance events
  └─> LLM infers:
      - baselineStyle, crisisStyle, hypeStyle, reflectiveStyle
      - emotionToStyleMap (emotional clusters -> preferred style)
      - personaPreferences (which personas fit which contexts)
      - boundaries (what to avoid)

chooseResponseStyleForInteraction()
  ├─> Gets current emotion + somatic state, channel, context
  ├─> Gets style profile + channel settings
  └─> LLM chooses:
      - tone (calm, hype, soft, blunt, etc.)
      - stance (companion, coach, strategist, therapist_like)
      - length (short, medium, long)
      - personaKey (which coach persona to route through)
      - channelHints

logEmotionInteraction()
  ├─> Logs interaction with input/output emotion states
  └─> Computes resonance_score from emotion change + feedback

deriveResonanceEventsForUser()
  ├─> Finds significant interactions (high/low resonance)
  └─> LLM generates summaries and pattern tags
```

### 2. Ethnographic Intelligence v1 Flow

```
upsertCultureContext()
  ├─> Creates/updates culture context (org, family, team, industry, region)
  └─> Tracks: key, name, kind, description, priority

refreshCultureProfileForContext()
  ├─> Gets context + norm logs
  └─> LLM infers:
      - norms (punctuality, hierarchy, risk tolerance, conflict style)
      - communicationStyle (tone, formality, humor, customs)
      - successMarkers, tabooBehaviors, politicalSensitivities
      - languagePatterns, decisionMakingStyle, hiddenRules

evaluateCultureAlignmentForContext()
  ├─> Gets context + profile + recent experience events
  └─> LLM evaluates:
      - alignmentOverall (0..1)
      - strengths, frictionPoints, riskAreas
      - suggestions for navigating culture

getCultureContextSnapshot()
  ├─> Helper for other systems to query culture contexts
  └─> Returns contexts + profiles for given keys
```

---

## Integration Points

### Weekly Brain Loop

```typescript
// In runWeeklyBrainLoopForUser()
await deriveResonanceEventsForUser(userId);
await refreshEmotionStyleProfileForUser(userId);

// Refresh culture profiles for key contexts
const keyContexts = ['primary_org', 'family_core'];
for (const key of keyContexts) {
  await refreshCultureProfileForContext(userId, key);
  await evaluateCultureAlignmentForContext(userId, key, weekEnd);
}
```

### Future Integration

- **Voice & Chat Frontend**: Before generating message, call `chooseResponseStyleForInteraction`, route through appropriate persona + style
- **Coaches**: Each coach asks router for style instead of hardcoding tone
- **Notifications / Autopilot**: Use `emotion_channel_settings` and style profile to decide whether to send/batch, how strong/soft the nudge should be
- **Autopilot / Email / Scripts**: When drafting emails or talk-tracks, pull appropriate culture context, use culture profile to choose formality, adjust risk language, avoid taboo topics, weave in relevant jargon/phrases
- **Timeline & Destiny**: When evaluating futures, consider if those futures are feasible in the cultures you inhabit
- **Simulation v2**: Use culture norms to influence probability of success for certain strategies, model how bosses/colleagues likely react to moves
- **Relationship & Career Coaches**: When giving career/office politics advice, use `getCultureContextSnapshot` for your bank/team

---

## Subsystem Status

- `emotional_resonance_v2` = `partial` (v2) in Brain Registry
- `ethnographic_intel` = `partial` (v1) in Brain Registry

---

## Next Steps

1. **Run Migrations**:
   - `supabase/migrations/20260120_emotional_resonance_v2.sql`
   - `supabase/migrations/20260120_ethnographic_intel_v1.sql`

2. **Emotion Resonance Integration**:
   - Wire style router into primary chat/voice generation path
   - Wire interaction logging + resonance scoring via Emotion OS and Somatic snapshots
   - Add channel settings UI for user preferences
   - Track emotion state changes after interactions to compute resonance scores

3. **Culture Integration**:
   - Auto-detect culture contexts from:
     - Organization/company data
     - Email domains
     - Calendar event participants
     - Relationship engine (family, work contacts)
   - Populate norm logs from:
     - Email patterns
     - Meeting summaries
     - User notes
   - Use culture context in:
     - Email/autopilot script generation
     - Timeline Coach & Simulation v2
     - Career/Relationship coaches

4. **UI Integration**:
   - Emotion style profile viewer/editor
   - Channel settings UI
   - Culture contexts dashboard
   - Culture alignment dashboard
   - Resonance events feed

---

## Impact

Pulse now:

- **Adapts how it speaks** - Dynamically adjusts tone, pacing, style based on your emotional state and preferences
- **Learns what helps** - Tracks which interventions actually regulate/calm/hype you in a good way
- **Understands your cultures** - Knows the norms, communication styles, taboos, and hidden rules of your environments
- **Navigates cultural fit** - Evaluates alignment and suggests strategies to navigate cultures while staying true to your values

And uses this to:

- **Speak in the right way** - Choose companion/coach/strategist stance based on what you need in that moment
- **Avoid tone-deaf suggestions** - Shape advice, scripts, and plans so they "fit the room"
- **Model cultural constraints** - Include culture norms in simulations and timeline evaluations
- **Guide cultural navigation** - Suggest small changes to navigate cultures better without betraying your values

This is the moment where Pulse doesn't just know how you feel—it speaks to you in the way that actually *helps* you most in that moment. And it understands the **cultures** you live and work in well enough to give advice and scripts that feel like:

> "This is exactly how someone like me should say this, **in this place, with these people**."

🧠💬🌍


