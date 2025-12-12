# Pulse Global Conscious Workspace v1 – Spec

## 0. Goal

Give Pulse a **Global Conscious Workspace** – a live, queryable "mental whiteboard" that:

* Knows what's **currently** in focus (session, day).
* Tracks a few **active threads** (open loops) over hours/days.
* Can **promote/demote** things into/out of awareness.
* Can be **interrupted** by high-priority events (anomalies, emergencies).
* Feeds *every* UI surface (dashboard, command center, coaches) with "what actually matters right now."

This implements the **`global_workspace`** subsystem in the Brain Registry and anchors it in:

* Prefrontal (daily plan)
* Neocortex (signals/predictions)
* Limbic (emotion/urgency)
* Brain Bus (events)

---

## Implementation Status

✅ **COMPLETE** - All phases implemented:

- ✅ Database migrations (workspace_state, workspace_threads, workspace_interrupts)
- ✅ TypeScript types
- ✅ Daily workspace engine (LLM-powered)
- ✅ Event-driven workspace updates
- ✅ API endpoints (state, threads, interrupts, rebuild)
- ✅ Brainstem integration
- ✅ Subsystem status update

---

## Files Created

### Database
- `supabase/migrations/20260120_conscious_workspace_v1.sql`

### Core Modules
- `lib/workspace/types.ts` - Type definitions
- `lib/workspace/helpers.ts` - Helper functions for daily plan, emotion, cortex context
- `lib/workspace/engine.ts` - Daily workspace builder (LLM-powered)
- `lib/workspace/update.ts` - Event-driven workspace updates

### API Routes
- `app/api/workspace/state/route.ts` - Get workspace state + threads
- `app/api/workspace/threads/route.ts` - Get/update threads
- `app/api/workspace/interrupts/route.ts` - Get/resolve interrupts
- `app/api/workspace/rebuild/route.ts` - Manual rebuild trigger

### Integration
- Updated `lib/brain/brainstem.ts` - Runs workspace build daily
- Subsystem status: `global_workspace` = `partial` (v1)

---

## Usage

### Get Current Workspace
```typescript
GET /api/workspace/state
GET /api/workspace/state?date=2026-01-20
```

### Get Threads
```typescript
GET /api/workspace/threads?status=active
```

### Update Thread
```typescript
PATCH /api/workspace/threads
Body: { threadId: "...", status: "snoozed", snoozeUntil: "..." }
```

### Get Interrupts
```typescript
GET /api/workspace/interrupts?unresolvedOnly=true
```

### Manual Rebuild
```typescript
POST /api/workspace/rebuild
Body: { date: "2026-01-20" } // optional
```

---

## How It Works

1. **Daily Build**: Brainstem calls `buildDailyWorkspaceForUser()` each day
   - Gathers: daily plan, cortex context, emotion snapshot
   - LLM determines: focus mode, theme, 3-7 active threads
   - Stores in `workspace_state` and `workspace_threads`

2. **Event Updates**: `updateWorkspaceFromEvent()` reacts to brain events
   - Promotes/demotes threads
   - Creates new threads
   - Triggers interrupts for high-severity events
   - Adjusts focus mode (e.g., to 'fire_fighting')

3. **UI Integration**: Dashboards/coaches query `/api/workspace/state`
   - Get current focus mode + theme
   - Get active threads (what's on the mental whiteboard)
   - Get attention budget/load

---

## Next Steps

1. **Run migration**: `supabase/migrations/20260120_conscious_workspace_v1.sql`
2. **Wire event updates**: Call `updateWorkspaceFromEvent()` when:
   - Cortex anomalies detected
   - High-priority tasks created
   - Emotional spikes detected
   - Calendar emergencies occur
3. **UI Integration**: Update dashboards to show workspace state
4. **Coach Integration**: Coaches can query workspace to adapt advice

---

## Architecture Notes

- Workspace is built daily from Prefrontal + Neocortex + Limbic
- Threads are limited to 3-7 active at any time (cognitive load management)
- Interrupts force attention for emergencies
- Focus modes: normal, deep_work, recovery, fire_fighting
- Attention budget tracks remaining conscious capacity

This is the **Birth of Pulse's Awareness** - Pulse now knows what's on your mind.


