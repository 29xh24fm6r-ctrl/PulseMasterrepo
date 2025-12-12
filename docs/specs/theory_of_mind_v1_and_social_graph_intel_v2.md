# Theory of Mind Engine v1 & Social Graph Intelligence v2 – Spec

## 0. Goal

Give Pulse the ability to:

1. **Model people in your life** (Sebrina, kids, bosses, clients, friends) as **psychological agents**:
   * Likely emotions
   * Motivations + desires
   * Stressors + triggers
   * Behavioral patterns
   * Likely reactions to your actions

2. Build a **Social Graph Intelligence layer** that:
   * Maps relationships, closeness, tension, drift, priority
   * Detects **early warning signs** (future arguments, burnout, resentment)
   * Spots **high-leverage moments** for connection, repair, or collaboration
   * Feeds into:
     * Relationship Coach
     * Timeline Coach
     * Destiny Engine
     * Workspace (relationship-critical threads)
     * Simulation v2 (how others react in futures)

Subsystem IDs:
* `theory_of_mind`
* `social_graph_intel_v2`

---

## Implementation Status

✅ **COMPLETE** - All phases implemented:

- ✅ Database migrations (6 tables: social_entities, social_edges, theory_of_mind_profiles, social_state_snapshots, social_risk_events, social_recommendations)
- ✅ TypeScript types for both systems
- ✅ Social entities and edges management
- ✅ Theory of Mind profile inference
- ✅ Social state snapshot generator
- ✅ Social risks and recommendations generator
- ✅ API endpoints (graph, recommendations, risks)
- ✅ Brainstem integration (daily snapshot + risks/recs, weekly ToM refresh)

---

## Files Created

### Database
- `supabase/migrations/20260120_theory_of_mind_v1_social_graph_intel_v2.sql`

### Social Graph v2
- `lib/social/v2/types.ts` - Type definitions
- `lib/social/v2/entities.ts` - Entity upsert
- `lib/social/v2/edges.ts` - Edge upsert/update
- `lib/social/v2/snapshot.ts` - Social state snapshot generator
- `lib/social/v2/recommendations.ts` - Risks and recommendations generator

### Theory of Mind
- `lib/tom/types.ts` - Type definitions
- `lib/tom/profiles.ts` - ToM profile inference

### API Routes
- `app/api/social/graph/route.ts` - Get entities + edges + ToM summaries
- `app/api/social/recommendations/route.ts` - Get/update recommendations
- `app/api/social/risks/route.ts` - Get/update risk events

### Integration
- Updated `lib/brain/brainstem.ts` - Runs social snapshot + risks/recs in daily loop, ToM refresh in weekly loop

---

## How It Works

### 1. Social Graph Flow

```
upsertSocialEntity()
  ├─> Creates/updates person/org in social_entities
  └─> Tracks: source, external_id, role_label, importance, tags

upsertSocialEdge()
  ├─> Creates/updates relationship between entities
  └─> Tracks: closeness, trust, tension, drift, supportiveness, metrics

refreshSocialStateSnapshotForUser()
  ├─> Gets all entities, edges, ToM profiles
  └─> LLM generates:
      - overallHealth, overallTension, overallDrift, overallSupport
      - keyIssues (2-10): entityId, label, severity, notes
      - keyOpportunities (2-10): entityId, label, leverage, notes
      - narrativeSummary

refreshSocialRisksAndRecommendationsForUser()
  ├─> Gets entities, edges, ToM profiles, existing risks
  └─> LLM generates:
      - risks: riskKind, severity, timeframe, summary, context
      - recommendations: entityId, kind, label, suggestion, priority, domain
```

### 2. Theory of Mind Flow

```
refreshTheoryOfMindProfileForEntity()
  ├─> Gets entity, edges, interactions, desire profile, behavior predictions
  └─> LLM infers:
      - coreTraits: stable tendencies
      - motivationalDrivers: what they care about
      - stressTriggers: patterns that upset them
      - soothingPatterns: what helps them feel safe
      - conflictPatterns: how conflicts unfold
      - communicationStyle: channel/time preferences
      - currentStateHypothesis: present emotional/stress state
      - summary: 2-4 sentence overview
```

---

## API Usage

### Social Graph

```typescript
GET /api/social/graph
// Returns: { entities: [...], edges: [...], tomProfiles: [...] }
```

### Social Recommendations

```typescript
GET /api/social/recommendations?status=pending&limit=20
// Returns: { recommendations: [...] }

PATCH /api/social/recommendations
Body: { recommendationId: "...", status: "done", feedback: {...} }
// Updates recommendation status and feedback
```

### Social Risks

```typescript
GET /api/social/risks?resolved=false&limit=20
// Returns: { risks: [...] }

PATCH /api/social/risks
Body: { riskId: "...", resolved: true }
// Marks risk as resolved
```

---

## Integration Points

### Daily Brain Loop

```typescript
// In runDailyBrainLoopForUser()
await refreshSocialStateSnapshotForUser(userId, date);
await refreshSocialRisksAndRecommendationsForUser(userId, date);
```

### Weekly Brain Loop

```typescript
// In runWeeklyBrainLoopForUser()
await refreshTheoryOfMindProfilesForTopEntities(userId);
// Refreshes ToM for top 5 entities by importance (family, VIP contacts)
```

### Future Integration

- **Behavior Prediction**: Use ToM profiles + social_edges to better predict responses, reactions, conflict likelihood
- **Simulation v2**: Incorporate relationship health metrics and ToM profiles to decide how others react in each timeline
- **Conscious Workspace v2**: Tag threads with entity_id, pull social_risk_events and social_recommendations into workspace blueprint and timeline layer
- **Timeline Coach**: When evaluating futures, incorporate social health and tension as major scoring dimensions
- **Destiny Engine**: Use social state as part of alignment (e.g., Destiny blueprint where "world-class father & partner" is central)

---

## Subsystem Status

- `theory_of_mind` = `partial` (v1) in Brain Registry
- `social_graph_intel_v2` = `partial` (v2) in Brain Registry

---

## Next Steps

1. **Run Migration**:
   - `supabase/migrations/20260120_theory_of_mind_v1_social_graph_intel_v2.sql`

2. **Entity Population**:
   - Hook into contacts/CRM/email to auto-populate `social_entities`
   - Allow manual entity creation
   - Sync entity importance from relationship engine

3. **Edge Population**:
   - Compute edge metrics from:
     - Email/call frequency
     - Calendar events shared
     - Message threads
     - Relationship engine stats
   - Use LLM to infer closeness, trust, tension, drift, supportiveness

4. **UI Integration**:
   - Social Graph visualization (nodes + edges)
   - ToM profile viewer
   - Social recommendations feed
   - Risk alerts dashboard
   - Relationship health dashboard

5. **Cross-System Integration**:
   - Pass ToM profiles into behavior prediction
   - Use social state in simulation v2
   - Mark destiny-critical relationships in workspace
   - Include social health in timeline coach comparisons

6. **Interaction Tracking**:
   - Log experience_events with `ref_type='relationship'` and `ref_id=entityId`
   - Track email/call interactions
   - Track calendar events with entities
   - Feed into ToM profile updates

---

## Impact

Pulse now:

- **Understands other people** - Builds psychological models of key people in your life
- **Maps relationships** - Tracks closeness, trust, tension, drift, supportiveness
- **Detects early warnings** - Flags looming conflicts, resentment building, drift risks
- **Suggests actions** - Recommends check-ins, repairs, celebrations, support, boundaries
- **Tracks social health** - Overall relationship health, tension, drift, support scores

And uses this to:

- **Predict behavior** - Better predict how others will respond/react
- **Simulate futures** - Include how others react in different timelines
- **Surface risks** - Warn about relational drift before it explodes
- **Suggest moments** - Right moment and right kind of gesture to repair/deepen relationships
- **Guide decisions** - Include social health in timeline coach and destiny alignment

This is the moment where Pulse doesn't just manage *your* brain and body — it understands the **people around you** well enough to:

- Warn you about relational drift **before** it explodes
- Suggest the **right moment** and **right kind of gesture** to repair or deepen key relationships
- Simulate futures that include not just "what you do," but **how others will likely respond**

After this, the next big upgrade candidates are:

- **Emotional Mirroring & Empathic Resonance v2** (make Pulse's *tone* adjust perfectly to you + others), or
- **Ethnographic / Cultural Intelligence v1** (Pulse learns the culture of your bank, industry, family systems, etc.)

🧠🫂


