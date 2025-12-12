# Pulse Meta-Learning & Wisdom Engine v1 – Spec

## 0. Goal

Give Pulse a **Meta-Learning & Wisdom Engine** that:

1. **Watches what happens** across Pulse:
   * actions taken,
   * predictions made,
   * advice given,
   * user choices,
   * eventual outcomes.

2. **Compares intent vs outcome**:
   * Did this work?
   * Did it backfire?
   * Was it aligned with values?
   * What pattern does this reinforce or break?

3. **Distills reusable wisdom**:
   * Lessons like: "When energy is low and social tension is high, don't schedule deep work with heavy meetings."
   * Heuristics & rules of thumb.
   * Playbooks: small libraries of "what tends to work for Matt (and people like him)."

4. **Feeds that wisdom back** into:
   * Autopilot planning,
   * Coaches,
   * Brainstem,
   * Ethical Compass (better tradeoffs),
   * Workspace prioritization.

This maps to a new subsystem: **`meta_learning` / `wisdom_engine`** in Brain Registry.

---

## Implementation Status

✅ **COMPLETE** - All phases implemented:

- ✅ Database migrations (experience_events, wisdom_lessons, personal_heuristics, wisdom_playbooks)
- ✅ TypeScript types
- ✅ Context snapshot helper
- ✅ Experience logger
- ✅ Aggregator (experiences → lessons)
- ✅ Heuristics builder (lessons → heuristics)
- ✅ Playbooks builder (lessons + heuristics → playbooks)
- ✅ Middleware (query wisdom for context)
- ✅ API endpoints (lessons, playbooks)
- ✅ Brainstem integration (weekly loop)

---

## Files Created

### Database
- `supabase/migrations/20260120_meta_learning_and_wisdom_engine_v1.sql`

### Wisdom Engine
- `lib/wisdom/types.ts` - Type definitions
- `lib/wisdom/context.ts` - Context snapshot builder
- `lib/wisdom/logger.ts` - Experience event logger
- `lib/wisdom/aggregator.ts` - Experiences → Lessons (LLM-powered)
- `lib/wisdom/lessons.ts` - Lessons → Heuristics (LLM-powered)
- `lib/wisdom/playbooks.ts` - Playbooks builder (LLM-powered)
- `lib/wisdom/middleware.ts` - Query wisdom for current context

### API Routes
- `app/api/wisdom/lessons/route.ts` - Get wisdom lessons
- `app/api/wisdom/playbooks/route.ts` - Get wisdom playbooks

### Integration
- Updated `lib/brain/brainstem.ts` - Runs wisdom refresh in weekly loop

---

## How It Works

### 1. Experience Logging Flow

```
logExperienceEvent()
  ├─> Captures: source, kind, description
  ├─> Context: emotion, somatic, narrative, workspace, social, identity
  ├─> Expectation: what was predicted/intended
  ├─> Outcome: what actually happened
  └─> Evaluation: success_score, alignment_delta, notes
```

### 2. Wisdom Aggregation Flow

```
refreshWisdomLessonsForUser()
  ├─> Load experience_events (last 14 days)
  └─> LLM analyzes patterns → wisdom_lessons
      - What works/doesn't work
      - Conditions where strategies succeed/fail
      - Specific, actionable lessons
```

### 3. Heuristics Compression

```
rebuildHeuristicsFromLessons()
  ├─> Load active wisdom_lessons
  └─> LLM compresses → personal_heuristics
      - Fast "if X then Y" rules
      - Merged related lessons
```

### 4. Playbook Generation

```
refreshWisdomPlaybooksForUser()
  ├─> Load lessons + heuristics
  └─> LLM groups → wisdom_playbooks
      - Scenario-based bundles
      - Trigger patterns
      - Linked lessons + heuristics
```

### 5. Decision-Time Wisdom

```
getWisdomForContext()
  ├─> Load all lessons, heuristics, playbooks
  └─> LLM selects relevant subset for current context
      - Returns distilled guidance
      - Actionable narrative
```

---

## API Usage

### Get Wisdom Lessons
```typescript
GET /api/wisdom/lessons?domain=work
```

### Get Wisdom Playbooks
```typescript
GET /api/wisdom/playbooks
```

---

## Integration Points

### Autopilot Integration (Future)

```typescript
import { logExperienceEvent, buildExperienceContext } from '@/lib/wisdom/logger';
import { buildExperienceContext } from '@/lib/wisdom/context';

// After executing action
const context = await buildExperienceContext(userId, new Date());
await logExperienceEvent({
  userId,
  source: 'autopilot',
  kind: 'action',
  refType: 'task',
  refId: action.taskId,
  description: `Executed: ${action.type}`,
  context,
  expectation: { outcome: 'task completed earlier' },
  outcome: { actual: 'task completed on time' },
  evaluation: { successScore: 0.8 },
});
```

### Planner Integration (Future)

```typescript
import { getWisdomForContext, buildExperienceContext } from '@/lib/wisdom/middleware';

const context = await buildExperienceContext(userId, date);
const wisdom = await getWisdomForContext(userId, context);

// Pass wisdom into planner LLM prompt
// "Here is your personal wisdom and what usually works: {wisdom.distilledGuidance}"
```

### Coach Integration (Future)

```typescript
// Coaches receive wisdom along with narrative/context
const wisdom = await getWisdomForContext(userId, context);
// Use wisdom.distilledGuidance to tailor advice
```

---

## Subsystem Status

`meta_learning` = `partial` (v1) in Brain Registry

---

## Next Steps

1. **Run Migration**: `supabase/migrations/20260120_meta_learning_and_wisdom_engine_v1.sql`

2. **Wire Experience Logging**:
   - Autopilot: Log after executing actions
   - Behavior Prediction: Log when predictions are validated
   - Coaches: Log when advice is accepted/ignored
   - Major events: Log with context

3. **Integrate Wisdom into Decision-Making**:
   - Planner: Use `getWisdomForContext()` before planning
   - Workspace: Use wisdom to prioritize threads
   - Coaches: Use wisdom to tailor advice

4. **UI Integration**:
   - Show wisdom lessons in dashboard
   - Display playbooks for current context
   - Show "Pulse learned this" insights

5. **Expand Experience Sources**:
   - Add more event types
   - Track more outcomes
   - Include user feedback

---

## Impact

Pulse now:

- **Learns from everything** - Experience events capture what happened
- **Finds patterns** - LLM distills lessons from experiences
- **Builds playbooks** - Scenario-based wisdom bundles
- **Applies wisdom** - Uses learned patterns in decision-making

And uses this to:

- **Avoid past mistakes** - "This didn't work before, try this instead"
- **Reinforce what works** - "This usually works for you in this context"
- **Build personal playbooks** - "Here's your protocol for overwhelmed days"
- **Get wiser over time** - Every week, Pulse learns more about what works for you

This is where Pulse becomes not just your **second brain**, but your **growing wisdom archive**. 🧠📚


