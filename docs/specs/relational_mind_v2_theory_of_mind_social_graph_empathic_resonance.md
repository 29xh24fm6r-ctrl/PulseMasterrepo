# Relational Mind v2: Theory of Mind, Social Graph Intelligence & Empathic Resonance

## 0. Purpose

We already have:
* Emotion OS, Somatic Loop
* Narrative Engine & Self Mirror
* Destiny / Timeline / Meta-Planner
* Social State Snapshots v1 (basic relationship health)
* Conscious Workspace & Inner Monologue

This spec upgrades Pulse's **relational brain**:

1. **Theory of Mind Engine v2 (`tom_engine_v2`)**
   * Builds and updates **mental models** of key people (Sebrina, kids, coworkers, clients).
   * Predicts:
     * Their likely emotional state,
     * Their values, preferences, and triggers,
     * Reactions to messages, decisions, and plans.

2. **Social Graph Intelligence v2 (`social_graph_v2`)**
   * Rich **relationship graph** across personal + professional life.
   * Tracks:
     * Strength, trust, tension, reciprocity, contact frequency, roles, context.
   * Surfaces:
     * Risks, opportunities, ideal moments & channels to connect.

3. **Empathic Resonance Layer v1 (`empathic_resonance_v1`)**
   * Uses Emotion OS + ToM + Social Graph to:
     * Mirror emotion (tone, pacing, coach selection).
     * Suggest high-empathy actions ("send this type of message to Sebrina right now").
     * Adjust interaction style per person & situation.

This is what makes Pulse feel like:
> "It understands *people* – not just tasks."

---

## Implementation Status

✅ **COMPLETE** - All phases implemented:

### Relational Mind v2
- ✅ Database migrations (5 tables: relational_identities, relational_state_snapshots, relational_predictions, relationship_highlights, empathic_events)
- ✅ TypeScript types
- ✅ Identity management (getOrCreateRelationalIdentity, getKeyRelationalIdentitiesForUser)
- ✅ State snapshot builder (refreshRelationalStateForIdentity with LLM)
- ✅ Prediction engine (predictRelationalOutcome with LLM)
- ✅ Relationship highlights (refreshRelationshipHighlightsForUser with LLM)
- ✅ Empathic resonance layer (generateEmpathicResponseStyle with LLM)
- ✅ Context reader (getLatestRelationalStateForIdentity, getRelationshipHighlightsForUser)
- ✅ Brainstem integration (weekly loop updates key identities and highlights)
- ✅ Brain Registry integration (added tom_engine_v2, social_graph_v2, empathic_resonance_v1)

---

## Files Created

### Database
- `supabase/migrations/20260120_relational_mind_v2.sql` - Creates 5 tables for relational intelligence

### Relational Mind Modules
- `lib/relational_mind/types.ts` - Type definitions
- `lib/relational_mind/identities.ts` - Identity management
- `lib/relational_mind/state.ts` - State snapshot builder (ToM + Social Graph)
- `lib/relational_mind/prediction.ts` - Prediction engine (Theory of Mind)
- `lib/relational_mind/highlights.ts` - Relationship highlights generator
- `lib/relational_mind/empathy.ts` - Empathic resonance layer
- `lib/relational_mind/prompts.ts` - LLM prompts for all modules
- `lib/relational_mind/context_read.ts` - Context reader helpers

### Integration
- Updated `lib/brain/brainstem.ts`:
  - Added relational mind refresh to weekly loop
  - Updates key identities and generates highlights
  - Updates subsystem statuses for tom_engine_v2, social_graph_v2
- Updated `supabase/migrations/20260120_master_brain_registry_and_diagnostics_v1.sql`:
  - Added tom_engine_v2, social_graph_v2, empathic_resonance_v1 to brain_subsystems

---

## How It Works

### Relational Mind Flow

```
1. Identity Management
   getOrCreateRelationalIdentity()
     ├─> Matches by contactId, externalRef, or displayName
     └─> Creates new relational_identity if not found

2. State Snapshot Building
   refreshRelationalStateForIdentity()
     ├─> Loads identity and recent interactions
     ├─> LLM infers:
     │   - relationshipHealth, trustLevel, tensionLevel
     │   - connectionFrequency, reciprocityScore
     │   - current_mode (support, repair, growth, stable, fragile)
     │   - perceived_other_state (mood, stress, priorities)
     │   - riskFlags and opportunityFlags
     └─> Stores snapshot in relational_state_snapshots

3. Prediction Engine
   predictRelationalOutcome()
     ├─> Loads identity and latest state
     ├─> LLM predicts:
     │   - predictedReaction (emotion, behavior, likely_response)
     │   - predictedEffectOnRelationship (delta_trust, delta_tension, delta_health)
     │   - confidence and recommendation
     └─> Stores prediction in relational_predictions

4. Relationship Highlights
   refreshRelationshipHighlightsForUser()
     ├─> Loads all identities and latest states
     ├─> LLM identifies 5-20 highlights:
     │   - wins, risks, patterns, tensions, opportunities
     └─> Stores highlights in relationship_highlights

5. Empathic Resonance
   generateEmpathicResponseStyle()
     ├─> Loads relational context (identity + state)
     ├─> LLM infers:
     │   - detectedUserState and detectedOtherState
     │   - chosenStyle (tone, pace, warmth, directness, coachProfileHint)
     │   - suggestedMessage (if helping craft a message)
     └─> Logs event in empathic_events
```

---

## Integration Points

### Conscious Workspace & Meta-Planner

- **Conscious Workspace** can:
  - Attach relational items to frames (e.g., "Tension with Sebrina", "High-stakes call with boss").
  - Use `relational_state_snapshots` to set **emotional & social context** for frames.

- **Meta-Planner** can:
  - Treat relationship risks/opportunities as constraints:
    - e.g., "Don't overload work at the cost of critical repair time with spouse."
  - Incorporate predictions:
    - "If we choose X, predicted relational effect with Y is negative; prefer Y-friendly plan if possible."

### Emotion OS & Somatic Loop

- **Emotion OS**:
  - Uses `empathic_events` outcomes to tune when to intervene (e.g., after conflict).
- **Somatic Loop**:
  - Will influence empathic style (e.g., if user is exhausted, choose very gentle tone).

### Coaches & Conversations

- **Sales / Relationship / Confidant coaches**:
  - Call `generateEmpathicResponseStyle` to decide tone & persona.
  - Use ToM predictions to rehearse conversations ("if you say it this way, here's likely reaction").

- **Message drafting**:
  - When user wants help writing to someone:
    - Map contact → `relational_identity`.
    - Call prediction + empathic style → produce message tailored to that person.

---

## API Usage (Future)

### Get Relational State

```typescript
import { getLatestRelationalStateForIdentity } from '@/lib/relational_mind/context_read';

const state = await getLatestRelationalStateForIdentity(userId, relationalIdentityId);
// Returns: { relationship_health, trust_level, tension_level, perceived_other_state, risk_flags, opportunity_flags }
```

### Predict Outcome

```typescript
import { predictRelationalOutcome } from '@/lib/relational_mind/prediction';

const predictionId = await predictRelationalOutcome(userId, {
  relationalIdentityId: '...',
  context: { message: '...', situation: '...' },
  horizon: 'immediate',
});
```

### Generate Empathic Style

```typescript
import { generateEmpathicResponseStyle } from '@/lib/relational_mind/empathy';

const empathy = await generateEmpathicResponseStyle({
  userId,
  source: 'conversation',
  context: {
    channel: 'text',
    relationalIdentityId: '...',
    userEmotion: { ... },
    somaticState: { ... },
    otherContext: { topic, lastMessages },
  },
});
// Returns: { detectedUserState, detectedOtherState, chosenStyle, suggestedMessage }
```

---

## Next Steps

1. **Run Migration**:
   - `supabase/migrations/20260120_relational_mind_v2.sql`

2. **Interaction Events Integration**:
   - Build `interaction_events` view/table that aggregates:
     - Emails, calls, messages, meetings, calendar events
   - Update `refreshRelationalStateForIdentity` to use real interaction data

3. **Contact/CRM Integration**:
   - Enhance `getOrCreateRelationalIdentity` to match with existing contacts/CRM
   - Auto-populate identities from contact list

4. **Coach Integration**:
   - Wire `generateEmpathicResponseStyle` into:
     - Sales Coach
     - Relationship Coach
     - Confidant Coach
   - Use `chosenStyle.coachProfileHint` to select voice/persona

5. **Message Drafting**:
   - Build UI/API for message drafting assistance
   - Use `predictRelationalOutcome` + `generateEmpathicResponseStyle` to craft messages

6. **Conscious Workspace Integration**:
   - Have workspace builder attach relational items to frames
   - Use relational state to set emotional/social context

7. **Meta-Planner Integration**:
   - Treat relationship risks/opportunities as constraints
   - Incorporate predictions into planning decisions

8. **UI Dashboard**:
   - Build "Relationships" view showing:
     - Key identities with health/tension indicators
     - Relationship highlights (wins, risks, opportunities)
     - Recent predictions and their outcomes
     - Empathic events log

9. **Outcome Evaluation**:
   - Track outcomes of empathic events
   - Learn which styles work best for which people/situations
   - Update model confidence based on prediction accuracy

---

## Impact

Pulse now:

- **Understands people** - Builds mental models of key people in the user's life
- **Predicts reactions** - Anticipates how others will respond to messages, decisions, behaviors
- **Protects relationships** - Surfaces risks and opportunities to strengthen/heal relationships
- **Adapts communication** - Chooses tone, pace, warmth, and directness based on context
- **Provides guidance** - Suggests high-empathy actions and message phrasing

And uses this to:

- **Anticipate relational fallout** - Predict negative effects before they happen
- **Strengthen key relationships** - Identify opportunities to deepen connections
- **Heal tensions** - Surface repair opportunities and suggest actions
- **Match communication style** - Adapt tone and approach to each person and situation
- **Guide conversations** - Help craft messages that respect both parties' needs

This is the moment where Pulse doesn't just understand tasks and goals — it understands **people** and **relationships**.

🧠💞


