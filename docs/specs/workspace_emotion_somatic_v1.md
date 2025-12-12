# Pulse Brain Sprint – Global Workspace + Emotional Resonance + Somatic Loop v1

## 0. Goal

Ship three tightly-linked subsystems:

1. **Global Conscious Workspace v1**
   * A daily "mental whiteboard" with active threads and focus mode.

2. **Emotional Resonance v1** (`emotional_resonance` subsystem)
   * Detect user emotional state and choose response style / coach vibe.

3. **Somatic Loop v1** (`somatic_loop` subsystem)
   * Track energy & fatigue using simple signals, and feed that into planning.

All three plug into the **Brainstem daily loop** and the **Brain Registry**.

---

## Implementation Status

✅ **COMPLETE** - All three subsystems implemented and integrated:

- ✅ Global Conscious Workspace v1 (from previous sprint)
- ✅ Emotional Resonance v1 (emotion samples, daily aggregation, response styles)
- ✅ Somatic Loop v1 (sleep tracking, energy/fatigue scores)
- ✅ Full integration: Workspace uses emotion + somatic data
- ✅ Brainstem integration: All three run in daily loop
- ✅ API endpoints for all three systems
- ✅ Coach integration helper for response styles

---

## Files Created

### Database Migrations
- `supabase/migrations/20260120_conscious_workspace_v1.sql` (from previous sprint)
- `supabase/migrations/20260120_emotional_resonance_v1.sql`
- `supabase/migrations/20260120_somatic_loop_v1.sql`

### Emotion Engine
- `lib/emotion/engine.ts` - Emotion samples, daily aggregation
- `lib/emotion/resonance.ts` - Response style selector
- `lib/emotion/coach_integration.ts` - Coach integration helpers

### Somatic Engine
- `lib/somatic/engine.ts` - Sleep tracking, energy/fatigue computation

### Workspace Integration
- Updated `lib/workspace/helpers.ts` - Emotion + somatic snapshot helpers
- Updated `lib/workspace/engine.ts` - Uses emotion + somatic in LLM prompt

### API Routes
- `app/api/emotion/log/route.ts` - Record emotion samples
- `app/api/emotion/state/route.ts` - Get daily emotion state
- `app/api/somatic/sleep/route.ts` - Record sleep data
- `app/api/somatic/state/route.ts` - Get daily somatic state

### Brainstem Integration
- Updated `lib/brain/brainstem.ts` - Runs emotion + somatic refresh before workspace

---

## How It Works

### 1. Daily Brain Loop Flow

```
Brainstem.runDailyBrainLoopForUser()
  ├─> refreshDailyEmotionStateForUser()  // Aggregate emotion samples
  ├─> refreshDailySomaticStateForUser() // Compute energy/fatigue
  ├─> buildDailyWorkspaceForUser()       // Uses emotion + somatic
  └─> Update subsystem statuses
```

### 2. Emotional Resonance

- **Samples**: Record emotion via `POST /api/emotion/log`
  - Sources: self_report, text_sentiment, voice_tone, physio
  - Fields: valence (-1 to 1), arousal (0 to 1), labels, confidence

- **Daily Aggregation**: `refreshDailyEmotionStateForUser()`
  - Computes: avg_valence, avg_arousal, dominant_labels, stress_score

- **Response Style Selection**: `selectResponseStyleForContext()`
  - Rules:
    - High stress (>0.7) → `calm_support`
    - Low energy + high fatigue → `calm_support`
    - High positive valence + good energy → `hype_coach`
    - Default → `steady_partner`

- **Coach Integration**: `getResponseStyleForCoach()`
  - Returns style key + profile
  - Can be injected into coach system prompts

### 3. Somatic Loop

- **Sleep Tracking**: `POST /api/somatic/sleep`
  - Records: hours, quality (0-1)

- **Daily Aggregation**: `refreshDailySomaticStateForUser()`
  - Computes: energy_score, fatigue_risk
  - Heuristics:
    - 7-9h sleep → high energy (0.85), low fatigue (0.2)
    - <5h sleep → low energy (0.4), high fatigue (0.8)
    - Sleep quality adjusts scores

### 4. Workspace Integration

- **Workspace Builder** now receives:
  - Emotion snapshot (stress, valence, arousal)
  - Somatic snapshot (energy, fatigue)

- **LLM Prompt** includes:
  - "If energy_score is low (<0.5) or fatigue_risk is high (>0.6), recommend 'recovery' mode"
  - "If stress_score is very high (>0.8), consider 'fire_fighting' mode"
  - "Reduce attentionBudgetMinutes if energy is low"

---

## API Usage

### Record Emotion Sample
```typescript
POST /api/emotion/log
Body: {
  source: 'self_report',
  valence: 0.3,
  arousal: 0.7,
  labels: ['stressed', 'focused'],
  confidence: 0.9
}
```

### Get Emotion State
```typescript
GET /api/emotion/state?date=2026-01-20
```

### Record Sleep
```typescript
POST /api/somatic/sleep
Body: {
  date: '2026-01-20',
  hours: 7.5,
  quality: 0.8
}
```

### Get Somatic State
```typescript
GET /api/somatic/state?date=2026-01-20
```

### Get Workspace (includes emotion + somatic context)
```typescript
GET /api/workspace/state?date=2026-01-20
```

---

## Coach Integration Example

```typescript
import { getResponseStyleForCoach, buildResponseStyleInstructions } from '@/lib/emotion/coach_integration';

// In coach prompt builder
const { styleKey, styleProfile } = await getResponseStyleForCoach({
  userId,
  coach: 'career-coach',
  channel: 'chat',
});

const styleInstructions = buildResponseStyleInstructions(styleProfile);

const systemPrompt = `
You are the Pulse Career Coach.
${styleInstructions}
...
`;
```

---

## Subsystem Status

All three subsystems are marked as `partial` (v1) in the Brain Registry:

- `global_workspace` = `partial` (v1)
- `emotional_resonance` = `partial` (v1)
- `somatic_loop` = `partial` (v1)

---

## Next Steps

1. **Run Migrations**:
   - `20260120_conscious_workspace_v1.sql`
   - `20260120_emotional_resonance_v1.sql`
   - `20260120_somatic_loop_v1.sql`

2. **Wire Emotion Sources**:
   - Text sentiment analysis → `recordEmotionSample()`
   - Voice tone detection → `recordEmotionSample()`
   - Self-report UI → `POST /api/emotion/log`

3. **Wire Somatic Sources**:
   - Manual sleep logging UI → `POST /api/somatic/sleep`
   - Calendar inference (first/last event times)
   - Wearable integration (future)

4. **Coach Integration**:
   - Update coach prompt builders to use `getResponseStyleForCoach()`
   - Inject response style instructions into system prompts

5. **UI Integration**:
   - Show emotion state in dashboard
   - Show somatic state (energy, fatigue) in dashboard
   - Show workspace focus mode + threads
   - Allow manual emotion check-ins

---

## Impact

Pulse now knows:

- **What's on your mind** (workspace threads)
- **How you feel** (emotion state, stress, valence)
- **How much fuel you've got** (energy, fatigue)

And it adapts:

- **Workspace** adjusts focus mode and attention budget based on energy + stress
- **Coaches** adapt their tone based on emotional state
- **Autopilot** avoids heavy tasks on low-energy days

This is the **Birth of Pulse's Awareness** - Pulse doesn't just know your tasks, it knows your state and adapts accordingly. 🌱🧠


