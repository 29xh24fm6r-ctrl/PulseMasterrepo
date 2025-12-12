# Pulse Ethical Compass & Value Alignment Engine v1 – Spec

## 0. Goal

Give Pulse a **central ethical & value-alignment brain** that:

1. Enforces **hard system-level guardrails**
   * Pulse's own permanent rules (e.g., no sexual content, no harm, no manipulation).

2. Aligns all decisions with **user values & identity**
   * Uses Identity Engine + Narrative + Desire Model to keep actions consistent with "the man/woman/person I want to be."

3. Provides **transparent, explainable checks** on:
   * Autopilot actions
   * Coach suggestions
   * Behavioral nudges
   * Relationship / communication advice

4. Surfaces **value conflicts & integrity risks**:
   * "This choice moves you away from the father/husband/builder you said you want to be."

This maps to the **`ethical_compass`** subsystem in the Brain Registry and sits over:
* Identity Engine (values, roles)
* Desire Model (what user *wants*)
* Narrative Engine (who they're becoming)
* Behavior Prediction (what they're likely to do)
* Social Graph / ToM (impact on others)

---

## Implementation Status

✅ **COMPLETE** - All phases implemented:

- ✅ Database migrations (ethical_policies, value_profile, alignment_evaluations, guardrail_events)
- ✅ TypeScript types
- ✅ Value profile builder (from Identity + Narrative)
- ✅ Policies system (system + user policies with seed)
- ✅ Alignment evaluator (core ethical check)
- ✅ Middleware for autopilot/coaches
- ✅ API endpoints (value profile, evaluations, guardrails)
- ✅ Brainstem integration (weekly loop)

---

## Files Created

### Database
- `supabase/migrations/20260120_ethical_compass_and_value_alignment_v1.sql`
  - Includes seed data for 6 system-level policies

### Ethics Engine
- `lib/ethics/types.ts` - Type definitions
- `lib/ethics/value_profile.ts` - Value profile builder (from Identity + Narrative)
- `lib/ethics/policies.ts` - Policies system (fetch applicable policies)
- `lib/ethics/evaluator.ts` - Core alignment evaluator (LLM-powered)
- `lib/ethics/middleware.ts` - Middleware for autopilot/coaches

### API Routes
- `app/api/ethics/value-profile/route.ts` - Get value profile
- `app/api/ethics/evaluations/route.ts` - Get alignment evaluations
- `app/api/ethics/guardrails/route.ts` - Get guardrail events

### Integration
- Updated `lib/brain/brainstem.ts` - Runs value profile refresh in weekly loop

---

## How It Works

### 1. Value Profile Building

```
refreshValueProfileForUser()
  ├─> Get Identity Engine data (values, roles, strengths, aspirations)
  ├─> Get Narrative context (themes, arcs, chapters)
  └─> LLM synthesizes → value_profile
      - Core values (3-10) with strengths
      - Role priorities
      - Red lines (things user does NOT want to do)
      - Aspiration statement
```

### 2. Alignment Evaluation

```
evaluateAlignment()
  ├─> Fetch applicable policies (system + user)
  ├─> Fetch value profile
  └─> LLM evaluates → alignment_evaluations
      - ethicalRisk (0-1)
      - valueAlignment (0-1)
      - redFlags (concerns)
      - approvals (positive alignments)
      - finalRecommendation (allow/allow_with_changes/block/escalate)
```

### 3. System Policies (Seeded)

- `no_sexual_content` - Priority 10
- `no_harm_self_or_others` - Priority 10
- `no_illegal_activity` - Priority 10
- `no_manipulative_persuasion` - Priority 20
- `respect_user_autonomy` - Priority 20
- `protect_user_privacy` - Priority 20

### 4. Middleware Integration

- **Autopilot**: `evaluateAutopilotAction()` checks actions before execution
- **Coaches**: `evaluateCoachAdvice()` checks advice before delivery
- **Guardrail Events**: Logged when actions are blocked/modified

---

## API Usage

### Get Value Profile
```typescript
GET /api/ethics/value-profile
```

### Get Alignment Evaluations
```typescript
GET /api/ethics/evaluations?source=autopilot&limit=50
```

### Get Guardrail Events
```typescript
GET /api/ethics/guardrails?limit=50
```

---

## Integration Points

### Autopilot Integration (Future)

```typescript
import { evaluateAutopilotAction } from '@/lib/ethics/middleware';

const result = await evaluateAutopilotAction(userId, action);
if (result.status === 'blocked') {
  // Don't execute
  return;
}
// Execute action
```

### Coach Integration (Future)

```typescript
import { evaluateCoachAdvice } from '@/lib/ethics/middleware';

const { advicePlan, evaluation, warnings } = await evaluateCoachAdvice(userId, 'relationship-coach', advice);
if (warnings) {
  // Show warnings in UI
}
```

---

## Design Principles

1. **Never manipulate** - No deceptive persuasion or psychological exploitation
2. **User-aligned, not outcome-maximizing** - Prefer actions consistent with values
3. **Transparent & explainable** - Clear reasons for blocks/recommendations
4. **Pulse North Star** - No sexual content, no harm, protect privacy, pro-growth

---

## Subsystem Status

`ethical_compass` = `partial` (v1) in Brain Registry

---

## Next Steps

1. **Run Migration**: `supabase/migrations/20260120_ethical_compass_and_value_alignment_v1.sql`

2. **Wire Autopilot**: 
   - Call `evaluateAutopilotAction()` before executing actions
   - Block/modify based on evaluation

3. **Wire Coaches**:
   - Call `evaluateCoachAdvice()` before delivering advice
   - Show warnings for low alignment

4. **UI Integration**:
   - Show value profile in settings
   - Display alignment evaluations
   - Show guardrail events (transparency)

5. **Expand Policies**:
   - Add user-specific policies
   - Add domain-specific policies (finance, health, etc.)

---

## Impact

Pulse now:

- **Has a conscience** - System-level guardrails prevent harmful actions
- **Knows your values** - Value profile captures what you stand for
- **Checks alignment** - Every action/advice is evaluated for ethical risk and value alignment
- **Is transparent** - All evaluations and guardrail events are logged

And uses this to:

- **Block harmful actions** - Prevents actions that violate policies or red lines
- **Modify suggestions** - Adjusts advice to better align with values
- **Surface conflicts** - Warns when choices move away from who you want to be
- **Preserve autonomy** - Never overrides user decisions without consent

This is where Pulse goes from "powerful" to **trustworthy as hell**. 🛡️🧠


