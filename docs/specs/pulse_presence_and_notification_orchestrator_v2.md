# Pulse Presence & Notification Orchestrator v2

## 0. Purpose

Right now we have:
* AGI Kernel v2 (autonomous loop)
* Conscious Console (brain status & surfaced insights)
* Meet Pulse (birth experience + preferences)
* Emotion OS, Somatic Loop, Relational Mind, Timeline/Destiny, etc.
* `pulse_brain_preferences` (presence, proactivity, sensitivity, etc.)
* `pulse_brain_surface_events` (things *worth* surfacing)

What we still need is:
> A **single brainstem layer** that decides
> **WHEN, WHERE, and HOW** Pulse actually talks to the user.

This orchestrator must:
1. Read:
   * Brain preferences (presence, proactivity, privacy, etc.)
   * User state (emotion, somatic, focus mode)
   * Context (time of day, device, calendar, deep work)
   * Event importance (risk/opportunity, urgency)

2. Decide per potential message:
   * **Channel**: app console, in-app notification, push, email, *or* stay quiet.
   * **Timing**: now, later today, tomorrow, bundle in a digest, or skip.
   * **Intensity**: short ping vs rich explanation, voice vs text.
   * **Guardrails**: never overwhelm, never nag, respect "Do Not Disturb" modes.

Subsystem ID: `presence_orchestrator_v2`.

---

## Implementation Status

✅ **COMPLETE** - All phases implemented:

### Presence Orchestrator v2
- ✅ Database migrations (3 tables: presence_events, presence_decisions, presence_daily_summaries)
- ✅ TypeScript types
- ✅ Event enqueue system (enqueuePresenceEvent)
- ✅ Presence context builder (buildPresenceContext)
- ✅ LLM-driven decider (runPresenceDeciderForUser)
- ✅ Decision executor (executePresenceDecision)
- ✅ Daily summaries (refreshPresenceDailySummary)
- ✅ Brainstem integration (daily loop calls decider and summaries)
- ✅ Brain Registry integration (added presence_orchestrator_v2)

---

## Files Created

### Database
- `supabase/migrations/20260120_pulse_presence_and_notification_orchestrator_v2.sql` - Creates 3 tables for presence orchestration

### Presence Orchestrator Modules
- `lib/presence/types.ts` - Type definitions
- `lib/presence/events.ts` - Event enqueue system (enqueuePresenceEvent)
- `lib/presence/state.ts` - Presence context builder (buildPresenceContext)
- `lib/presence/prompts.ts` - LLM prompts for decider
- `lib/presence/decider.ts` - LLM-driven decision-making (runPresenceDeciderForUser)
- `lib/presence/executor.ts` - Decision executor (executePresenceDecision)
- `lib/presence/summaries.ts` - Daily summaries (refreshPresenceDailySummary)

### Integration
- Updated `lib/brain/brainstem.ts`:
  - Added Presence Orchestrator calls to daily loop
  - Calls runPresenceDeciderForUser and refreshPresenceDailySummary
  - Updates subsystem status for presence_orchestrator_v2
- Updated `supabase/migrations/20260120_master_brain_registry_and_diagnostics_v1.sql`:
  - Added presence_orchestrator_v2 to brain_subsystems

---

## How It Works

### Presence Orchestrator Flow

```
1. Event Enqueue
   enqueuePresenceEvent()
     ├─> Other modules call this instead of directly pinging user
     └─> Creates presence_events record

2. Presence Decider
   runPresenceDeciderForUser()
     ├─> Builds presence context (prefs, emotion, somatic, focus mode)
     ├─> Loads unconsumed presence_events
     ├─> LLM decides for each event:
     │   - decision: send_now, schedule, bundle, suppress
     │   - chosenChannel: console, notification, email, voice, none
     │   - scheduledFor: timestamp (if scheduled)
     │   - rationale: explanation
     └─> Creates presence_decisions records

3. Decision Execution
   executePresenceDecision()
     ├─> For send_now decisions, immediately executes
     ├─> Creates pulse_brain_surface_events with chosen channel
     └─> Marks decision as executed

4. Daily Summaries
   refreshPresenceDailySummary()
     ├─> Aggregates events generated, surfaced, notifications sent
     ├─> Tracks user acknowledgements (liked, dismissed, acted, snoozed)
     └─> Stores in presence_daily_summaries
```

---

## Decision Rules

The LLM-driven decider respects:

- **Focus Mode**:
  - `deep_work`: Suppress or schedule non-critical items
  - `off_hours`: Prefer schedule or suppress unless high-importance or relationship/health
  - `normal`: Standard decision-making

- **Presence Level** (from preferences):
  - `low`: Only top 1-3 most important items
  - `medium`: 3-5 items
  - `high`: Up to 7-10 items

- **Privacy Sensitivity**:
  - High sensitivity: Avoid intimate insights via notification unless critical; prefer console

- **Channel Selection**:
  - `console`: Default for most insights
  - `notification`: Sparingly, for high-importance/time-sensitive items
  - `email`: For digest-style content
  - `voice`: Future voice surfaces
  - `none`: If suppressing

---

## Integration Points

### Where to Enqueue Presence Events

Replace direct user-facing pings with `enqueuePresenceEvent`:

- **AGI Kernel insights** → `kind: 'insight', 'risk_alert', 'opportunity'`
- **Relational highlights** → `kind: 'risk_alert'` / `'opportunity'` with `domain: 'relationships'`
- **Health/somatic warnings** → `kind: 'risk_alert', domain: 'health'`
- **Timeline/Destiny important forks** → `kind: 'nudge'` / `'insight'`
- **Coaches** → `kind: 'nudge'` or `'reminder'` rather than direct notification

Example:

```typescript
import { enqueuePresenceEvent } from '@/lib/presence/events';

await enqueuePresenceEvent(userId, {
  source: 'relational_mind',
  originId: highlight.id,
  kind: 'risk_alert',
  title: 'Tension building with Sebrina',
  body: 'Pulse sees signs of rising tension. Might be a good moment to check in gently.',
  importance: 0.9,
  urgency: 0.7,
  domain: 'relationships',
  suggestedChannel: 'notification',
  suggestedTimeWindow: { preferred: new Date().toISOString() },
  context: { relationalIdentityId: highlight.relational_identity_id },
});
```

---

## Next Steps

1. **Run Migration**:
   - `supabase/migrations/20260120_pulse_presence_and_notification_orchestrator_v2.sql`

2. **Replace Direct Notifications**:
   - Find all places that directly create notifications/emails
   - Replace with `enqueuePresenceEvent` calls
   - Let orchestrator decide when/how to surface

3. **Focus Mode Integration**:
   - Build `focus_mode_state` table to track deep work / DND windows
   - Update `buildPresenceContext` to query real focus mode state

4. **Calendar Integration**:
   - Build `calendar_state_snapshots` table/view
   - Update `buildPresenceContext` to include calendar context

5. **Scheduled Execution**:
   - Build scheduler to execute `scheduled_for` decisions at the right time
   - Handle `bundle` decisions (group multiple events into digest)

6. **Notification System Integration**:
   - Wire `delivery_channel: 'notification'` events to actual push notification system
   - Wire `delivery_channel: 'email'` events to email sending system

7. **Voice Integration**:
   - Build voice output system for `delivery_channel: 'voice'` events
   - Integrate with voice assistant interfaces

8. **Analytics & Learning**:
   - Track which decisions users respond well to
   - Learn optimal timing and channel selection
   - Adjust decision-making based on user feedback

9. **Hourly Loop** (Optional):
   - Add hourly presence loop for more frequent decision-making
   - Useful for time-sensitive events

---

## Impact

Pulse now:

- **Respects context** - Considers focus mode, time of day, user state before speaking
- **Chooses channels wisely** - Console, notification, email, or voice based on importance and context
- **Manages presence budget** - Stays within user's preferred presence level
- **Times messages well** - Schedules or suppresses based on user's current state
- **Learns from feedback** - Tracks acknowledgements to improve future decisions

And uses this to:

- **Avoid overwhelm** - Never spams or nags the user
- **Respect boundaries** - Honors deep work and off-hours
- **Surface critical items** - Ensures important risks/opportunities are seen
- **Personalize experience** - Adapts to user's presence preferences
- **Improve over time** - Learns which decisions work best

This is the moment where Pulse stops feeling "chat-only" and starts feeling like a **polite, well-timed presence** that shows up at the right moments, without being clingy, spammy, or overwhelming.

🧠📲


