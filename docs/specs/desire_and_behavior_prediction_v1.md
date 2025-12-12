# Pulse Desire Modeling + Behavioral Prediction v1 – Spec

## 0. Goal

Add two tightly-linked subsystems to the Pulse Brain:

1. **Desire Modeling Engine v1** (`desire_model`)
   * Learns what the **user** and **each important contact** truly want/prefer:
     * preferred outcomes
     * communication styles
     * reward patterns
     * avoidance triggers
     * value priorities

2. **Behavioral Prediction Engine v1** (`behavior_prediction`)
   * Predicts **likely behaviors** for:
     * the user (self)
     * each contact in the user's graph
   * Horizons:
     * **Self**: goal adherence, task completion, habit follow-through, drift risk.
     * **Contacts**: reply likelihood, meeting follow-through, conflict risk, receptivity to asks.

These engines will:
* Feed **Conscious Workspace**, **Prefrontal planning**, **Coaches**, **Autopilot**, and **Social/ToM**.
* Be explicitly **pro-social and non-manipulative**: support better timing, empathy, alignment, and self-control—not dark persuasion.

---

## Implementation Status

✅ **COMPLETE** - All phases implemented:

- ✅ Database migrations (desire_signals, desire_profiles, behavior_predictions)
- ✅ TypeScript types
- ✅ Desire signal recording system
- ✅ Desire profile engine (LLM-powered)
- ✅ Self behavior prediction engine
- ✅ Contact behavior prediction engine
- ✅ API endpoints (desire profiles, behavior predictions)
- ✅ Brainstem integration (daily loop)

---

## Files Created

### Database
- `supabase/migrations/20260120_desire_and_behavior_prediction_v1.sql`

### Desire Engine
- `lib/desire/types.ts` - Type definitions
- `lib/desire/signals.ts` - Signal recording (self choices, contact interactions)
- `lib/desire/engine.ts` - Profile building (LLM-powered)

### Behavior Engine
- `lib/behavior/types.ts` - Type definitions
- `lib/behavior/self.ts` - Self behavior prediction
- `lib/behavior/contacts.ts` - Contact behavior prediction

### API Routes
- `app/api/desire/profile/route.ts` - Get desire profiles
- `app/api/behavior/predictions/route.ts` - Get behavior predictions

### Integration
- Updated `lib/brain/brainstem.ts` - Runs desire + behavior refresh daily

---

## How It Works

### 1. Desire Modeling Flow

```
refreshDesireProfilesForUser()
  ├─> buildDesireProfileForEntity(self)
  └─> buildDesireProfileForEntity(contact) for each important contact
       └─> LLM analyzes desire_signals → desire_profiles
```

### 2. Desire Signals

- **Recording**: `recordDesireSignal()`, `recordSelfChoice()`, `recordContactInteraction()`
- **Sources**: tasks, deals, email, journal, calls, manual
- **Kinds**: chose, avoided, complained, celebrated, requested, etc.
- **Features**: Structured data about the signal

### 3. Desire Profiles

- **Input**: All desire_signals for an entity
- **LLM Analysis**: Infers priorities, avoidance triggers, preferred styles, long-term desires
- **Output**: desire_profiles with summary, priorities, triggers, styles, desires

### 4. Self Behavior Prediction

- **Input**: Desire profile (self) + emotion + somatic + narrative + cortex + plan
- **Targets**: Today's tasks, active goals, key habits
- **LLM Analysis**: Predicts completion, deferral, procrastination, drop risk
- **Output**: behavior_predictions with probabilities and interventions

### 5. Contact Behavior Prediction

- **Input**: Desire profile (contact) + relationship context + pending interactions
- **Targets**: Pending emails, requests, invitations, meetings
- **LLM Analysis**: Predicts reply likelihood, acceptance, conflict risk
- **Output**: behavior_predictions with probabilities and empathic interventions

---

## API Usage

### Get Desire Profile
```typescript
GET /api/desire/profile?entityType=self
GET /api/desire/profile?entityType=contact&entityId=contact-123
```

### Get Behavior Predictions
```typescript
GET /api/behavior/predictions?entityType=self&horizon=today
GET /api/behavior/predictions?entityType=contact&entityId=contact-123
```

---

## Integration Points

### Workspace Integration (Future)

The workspace builder can use behavior predictions to:
- Weight threads by completion likelihood
- Identify high-risk items that need intervention
- Adjust attention budget based on predicted drift

### Coach Integration (Future)

Coaches can use:
- **Self predictions**: Pre-empt weak spots, suggest guardrails
- **Contact predictions**: Suggest timing, phrasing, approach for interactions

### Autopilot Integration (Future)

Autopilot can:
- Avoid creating unrealistic plans
- Trigger early interventions for high-risk items
- Adjust timing based on contact predictions

---

## Subsystem Status

- `desire_model` = `partial` (v1)
- `behavior_prediction` = `partial` (v1)

---

## Next Steps

1. **Run Migration**: `supabase/migrations/20260120_desire_and_behavior_prediction_v1.sql`

2. **Wire Signal Recording**:
   - Task completion → `recordSelfChoice()`
   - Email replies → `recordContactInteraction()`
   - Deal outcomes → `recordSelfChoice()` or `recordContactInteraction()`
   - Meeting behaviors → `recordContactInteraction()`

3. **Expand Prediction Targets**:
   - Add more interaction types (emails, meetings, requests)
   - Include habit tracking
   - Add relationship health predictions

4. **UI Integration**:
   - Show desire profiles in contact cards
   - Display behavior predictions in dashboard
   - Show intervention suggestions

5. **Workspace/Coach Integration**:
   - Use predictions in workspace thread selection
   - Reference predictions in coach advice
   - Trigger interventions based on predictions

---

## Impact

Pulse now:

- **Knows what you want** - Desire profiles capture true preferences
- **Knows what contacts want** - Understands their values and triggers
- **Predicts your behavior** - Forecasts completion, drift, procrastination
- **Predicts contact behavior** - Forecasts replies, acceptance, conflict

And it uses this to:

- **Shape plans** - Realistic expectations based on predictions
- **Time interactions** - Better timing for contact communications
- **Pre-empt problems** - Early interventions for high-risk items
- **Align with values** - Everything stays value-aligned and non-manipulative

This is a huge step toward "Pulse as a mirror mind" for you and your whole ecosystem. 🧠✨


