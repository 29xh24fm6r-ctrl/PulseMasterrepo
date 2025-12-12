# Pulse Theory of Mind + Social Graph Intelligence v1 – Spec

## 0. Goal

Add two major subsystems:

1. **Theory of Mind Engine v1** (`theory_of_mind`)
   * Builds and maintains **mental models** for:
     * the **user** and
     * each **important contact**.
   * Models:
     * tendencies,
     * likely interpretations,
     * internal constraints (fear, stress, cognitive style),
     * how they **perceive the user**.

2. **Social Graph Intelligence v1** (`social_graph_intel`)
   * Maintains a **weighted relationship graph**:
     * nodes = user + contacts,
     * edges = relationship quality, tension, influence, frequency.
   * Surfaces:
     * drifting relationships,
     * high-influence nodes,
     * tension hotspots,
     * ideal moments to reach out.

These sit on top of:
* **Desire Modeling** (what they want),
* **Behavior Prediction** (probable actions),
* **Relationship Engine** (history & health),
* **Narrative** (roles & arcs),
* **Emotion/Somatic** (for the user).

---

## Implementation Status

✅ **COMPLETE** - All phases implemented:

- ✅ Database migrations (mind_models, social_nodes, social_edges, social_insights)
- ✅ TypeScript types
- ✅ Theory of Mind engine (mental models for self + contacts)
- ✅ Social nodes builder
- ✅ Social edges builder (relationship metrics)
- ✅ Social insights generator
- ✅ API endpoints (mind models, social graph, insights)
- ✅ Brainstem integration (daily loop)

---

## Files Created

### Database
- `supabase/migrations/20260120_theory_of_mind_and_social_graph_v1.sql`

### Theory of Mind Engine
- `lib/mind/types.ts` - Type definitions
- `lib/mind/engine.ts` - Mind model building (LLM-powered)

### Social Graph Engine
- `lib/social/types.ts` - Type definitions
- `lib/social/nodes.ts` - Social nodes builder
- `lib/social/edges.ts` - Social edges builder (relationship metrics)
- `lib/social/insights.ts` - Social insights generator

### API Routes
- `app/api/mind/model/route.ts` - Get mind models
- `app/api/social/graph/route.ts` - Get social graph (nodes + edges)
- `app/api/social/insights/route.ts` - Get social insights

### Integration
- Updated `lib/brain/brainstem.ts` - Runs ToM + Social refresh daily

---

## How It Works

### 1. Theory of Mind Flow

```
refreshMindModelsForUser()
  ├─> buildMindModelForEntity(self)
  └─> buildMindModelForEntity(contact) for each important contact
       └─> LLM analyzes desire profile + behavior + relationship → mind_models
```

### 2. Mind Models

- **Input**: Desire profile, behavior predictions, relationship context, communication samples
- **LLM Analysis**: Infers cognitive style, emotional patterns, conflict patterns, trust model, perception of user
- **Output**: mind_models with summary, cognitive style, emotional pattern, conflict pattern, trust model, perception of user, typical reactions, constraints

### 3. Social Graph Flow

```
refreshSocialNodesForUser() → social_nodes (self + contacts)
refreshSocialEdgesForUser() → social_edges (relationship metrics)
refreshSocialInsightsForUser() → social_insights (graph-level insights)
```

### 4. Social Nodes

- **Self Node**: Always present, importance_score = 1
- **Contact Nodes**: From contacts table, with roles, importance_score, last_interaction_at

### 5. Social Edges

- **Metrics**: strength, trust, tension, drift, influence, positivity (all 0..1)
- **Input**: Relationship context, mind models (self + contact), desire profiles (self + contact)
- **LLM Analysis**: Estimates relationship metrics from user's perspective

### 6. Social Insights

- **Top Relationships**: High combination of strength, importance, influence
- **Drift Warnings**: Relationships with high drift or long time since interaction
- **Tension Hotspots**: Relationships with high tension and low positivity
- **Reachout Opportunities**: High-potential positive impact if user reaches out

---

## API Usage

### Get Mind Model
```typescript
GET /api/mind/model?entityType=self
GET /api/mind/model?entityType=contact&entityId=contact-123
```

### Get Social Graph
```typescript
GET /api/social/graph
// Returns: { nodes: [...], edges: [...] }
```

### Get Social Insights
```typescript
GET /api/social/insights
// Returns: { insights: { summary, topRelationships, driftWarnings, tensionHotspots, reachoutOpportunities } }
```

---

## Integration Points

### Communication Coach (Future)

Coaches can use mind models + social edges to suggest:
- Phrasing (based on cognitive style)
- Timing (based on constraints and emotional patterns)
- Level of directness (based on conflict patterns)
- Whether to push or support (based on trust model and tension)

### Relationship Engine (Future)

Uses social insights to suggest:
- "Hey, it's a good week to reconnect with X; here's why."
- "Y relationship is drifting; consider a check-in."

### Workspace & Planning (Future)

Adds high-tension or high-influence relationships into:
- workspace_threads
- daily/weekly planning

### Sales / Deals (Future)

For key clients, ToM + Social Graph help plan:
- Stakeholder mapping
- Likely internal politics
- Messaging strategies (ethical and value-aligned)

---

## Subsystem Status

- `theory_of_mind` = `partial` (v1)
- `social_graph_intel` = `partial` (v1)

---

## Next Steps

1. **Run Migration**: `supabase/migrations/20260120_theory_of_mind_and_social_graph_v1.sql`

2. **Wire Communication Samples**:
   - Fetch emails, messages, notes involving contacts
   - Use in mind model building

3. **Expand Relationship Context**:
   - Get more detailed relationship stats
   - Include sentiment trends
   - Add interaction frequency metrics

4. **UI Integration**:
   - Show mind models in contact cards
   - Display social graph visualization
   - Show insights (drift warnings, reachout opportunities)

5. **Coach Integration**:
   - Use mind models in communication coach
   - Reference social insights in relationship coach
   - Use ToM for meeting prep

---

## Impact

Pulse now:

- **Has mental models** - Understands how you and contacts think, feel, react
- **Sees the relationship ecosystem** - Maps your entire social graph
- **Identifies patterns** - Drift warnings, tension hotspots, reachout opportunities
- **Guides strategically** - Knows how everyone tends to think and react

And uses this to:

- **Improve communication** - Better phrasing, timing, approach based on cognitive style
- **Maintain relationships** - Proactive suggestions for reconnecting
- **Navigate tensions** - Understand conflict patterns and trust models
- **Time interactions** - Know when to reach out for maximum positive impact

This is a huge step toward Pulse as a strategist who knows *how everyone tends to think and react*. 🧠✨


