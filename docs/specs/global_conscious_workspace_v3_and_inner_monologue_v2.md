# Global Conscious Workspace v3 & Inner Monologue Engine v2 – Spec

## 0. Purpose

You've now built:
* AGI Kernel + Neocortex
* Narrative, Destiny, Timeline, Self Mirror
* Emotion, Somatic, Social Graph, Theory of Mind
* Creative Cortex, Wisdom, Ethnographic Intel, etc.

This spec adds the **coordination mind**:

1. **Global Conscious Workspace v3 (`conscious_workspace_v3`)**
   * Single "mental whiteboard" where:
     * High-priority issues, insights, simulations, risks, and opportunities show up.
     * Subsystems post "cards," compete for **attention**, and get **time slices**.
     * Conflicts are detected and surfaced ("this plan fights your values / destiny / social context").

2. **Inner Monologue Engine v2 (`inner_monologue_v2`)**
   * Ongoing "thinking out loud" layer that:
     * Reflects on what's in the workspace.
     * Chains reasoning over minutes/hours/days.
     * Generates "self-talk" primitives the UI can show, and other engines can consume.

This is the **Global Workspace Theory** layer:

> Attention, reflection, and cross-system coherence.

---

## Implementation Status

✅ **COMPLETE** - All phases implemented:

- ✅ Database migrations (6 tables: conscious_frames, conscious_items, conscious_links, conscious_conflicts, inner_monologue_turns, attention_events)
- ✅ TypeScript types
- ✅ Frame builder (builds frames from all subsystem contexts)
- ✅ Attention/focus selection (chooses 1-3 focus items per frame)
- ✅ Conflict detection (identifies tensions between items)
- ✅ Inner monologue generator (chains reasoning over frames)
- ✅ Context helpers (for other systems to query workspace)
- ✅ API endpoints (frame/latest, items, conflicts, monologue)
- ✅ Brainstem integration (daily loop)

---

## Files Created

### Database
- `supabase/migrations/20260120_global_conscious_workspace_v3.sql`

### Conscious Workspace v3
- `lib/conscious_workspace/v3/types.ts` - Type definitions
- `lib/conscious_workspace/v3/builder.ts` - Frame builder
- `lib/conscious_workspace/v3/attention.ts` - Focus selection
- `lib/conscious_workspace/v3/conflicts.ts` - Conflict detection
- `lib/conscious_workspace/v3/monologue.ts` - Inner monologue generator
- `lib/conscious_workspace/v3/context_read.ts` - Context helpers

### API Routes
- `app/api/conscious/frame/latest/route.ts` - Get latest frame + items
- `app/api/conscious/items/route.ts` - List items (filterable)
- `app/api/conscious/conflicts/route.ts` - List conflicts
- `app/api/conscious/monologue/route.ts` - Get recent monologue turns

### Integration
- Updated `lib/brain/brainstem.ts` - Runs frame building, focus selection, conflict detection, and monologue generation in daily loop

---

## How It Works

### 1. Conscious Workspace v3 Flow

```
buildConsciousFrameForUser()
  ├─> Pulls from: timeline, destiny, narrative, self mirror, emotion, somatic, social, risks
  └─> LLM generates:
      - frameSummary: summary, dominantContext, overallUrgency, overallComplexity, overallLoad
      - items: tasks, risks, insights, tradeoffs, questions, plan nodes
      - Each item has: sourceSubsystem, kind, title, description, urgency, importance, emotionalSalience
      - attention_score computed from urgency + importance + emotionalSalience

selectFocusItemsForFrame()
  ├─> Gets all items in frame
  └─> LLM chooses 1-3 focus items that deserve active attention
      - Logs attention_events (from none to each selected)

detectConflictsForFrame()
  ├─> Gets all items in frame
  └─> LLM identifies pairs in tension:
      - values_vs_plan, destiny_vs_short_term, relationship_vs_work, health_vs_overwork
      - Provides: conflictKind, severity, description, suggestedResolutions
```

### 2. Inner Monologue v2 Flow

```
runInnerMonologueForFrame()
  ├─> Gets frame, selected focus items, recent monologue (last 20 steps)
  └─> LLM generates chain of thought:
      - mode: 'analysis', 'reflection', 'planning', 'self_check', 'prediction'
      - content: inner-narration (not user-facing)
      - referencedSubsystems: which subsystems were consulted
      - derivedActions: suggested tasks/decisions
      - emotionalTone: { valence, arousal, stance }
      - Respects continuity from recent monologue
```

---

## API Usage

### Conscious Workspace

```typescript
GET /api/conscious/frame/latest
// Returns: { frame, items: [...] }

GET /api/conscious/items?frameId=...&selected=true&limit=...
// Returns: { items: [...] }

GET /api/conscious/conflicts?frameId=...&limit=...
// Returns: { conflicts: [...] }

GET /api/conscious/monologue?limit=...
// Returns: { turns: [...] }
```

---

## Integration Points

### Daily Brain Loop

```typescript
// In runDailyBrainLoopForUser()
const { frameId } = await buildConsciousFrameForUser(
  userId,
  { kind: 'scheduled_loop', source: 'daily_brain_loop', reference: { date } },
  date
);

if (frameId) {
  await selectFocusItemsForFrame(userId, frameId);
  await detectConflictsForFrame(userId, frameId);
  await runInnerMonologueForFrame(userId, frameId);
}
```

### Future Integration

- **From Brainstem / loops**: Daily loop builds frame for day's start or after significant events, weekly loop builds high-level summary frame
- **From User Actions**: When user opens Pulse or enters a heavy message, trigger new frame with `triggerKind = 'user_message'`
- **Downstream**: Timeline Coach, Creative Cortex, Autopilot can query latest frames & items for context, attach new items into future frames
- **Self Mirror & Workspace**: Self Mirror snapshots can be linked in frame payloads, conscious conflicts and highlights can influence Destiny alignment, Timeline decisions, Emotional style
- **UI Surface**: "Mind View" showing current frame summary, top 3 conscious items, conflicts & suggested resolutions, optionally sanitized inner monologue lines

---

## Subsystem Status

- `conscious_workspace_v3` = `partial` (v3) in Brain Registry
- `inner_monologue_v2` = `partial` (v2) in Brain Registry

---

## Next Steps

1. **Run Migration**:
   - `supabase/migrations/20260120_global_conscious_workspace_v3.sql`

2. **Frame Triggering**:
   - Trigger frames on user messages/actions
   - Trigger frames after significant events (simulation results, social risks, etc.)
   - Build weekly summary frames

3. **Subsystem Integration**:
   - Have subsystems post items to frames (e.g., Timeline Coach posts timeline decisions, Social Graph posts risks, Creative Cortex posts ideas)
   - Use frame context in subsystem prompts

4. **UI Integration**:
   - "Mind View" dashboard showing:
     - Current frame summary
     - Top 3 conscious items
     - Conflicts & suggested resolutions
     - Recent inner monologue (sanitized for user)
   - Allow user to interact with items (resolve, snooze, prioritize)

5. **Cross-System Integration**:
   - Use conscious items in workspace threads
   - Use conflicts to adjust timeline decisions
   - Use monologue insights in coaching
   - Feed frame summaries into self mirror

---

## Impact

Pulse now:

- **Coordinates all subsystems** - Single "mental whiteboard" where high-priority issues, insights, risks, and opportunities show up
- **Manages attention** - Chooses 1-3 focus items that deserve active reasoning
- **Detects conflicts** - Surfaces tensions between plans, values, destiny, relationships, health
- **Maintains continuity** - Chains reasoning over minutes/hours/days through inner monologue
- **Provides context** - Other systems can query latest frames/items for context

And uses this to:

- **Resolve conflicts** - Suggested resolutions for tensions
- **Guide focus** - Attention router ensures most important things get thought about
- **Chain reasoning** - Inner monologue maintains train of thought across events
- **Surface insights** - Conflicts and monologue insights feed into coaching and planning
- **Coordinate actions** - Frame items can trigger tasks, plans, conversations

This is the moment where Pulse doesn't just *have* all these systems — it has a **central mind-space** where:

- The most important things rise into focus
- Conflicts get spotted
- And an inner voice keeps thinking between events

This is the **Global Workspace Theory** layer: Attention, reflection, and cross-system coherence.

🧠🌐


