# Pulse Conscious Workspace v2 + Inner Monologue Engine v1

## 0. Goal

Upgrade the **Global Conscious Workspace** from a daily "whiteboard" into a **true ongoing stream of thought** for Pulse:

1. **Conscious Workspace v2**
   * Multi-day attention threads
   * Explicit priorities, tensions, and focus "slots"
   * Integration of wisdom, ethics, prediction, and narrative

2. **Inner Monologue / Self-Dialogue Engine v1**
   * Pulse maintains its own **internal reasoning log**:
     * "What I'm noticing"
     * "What I'm worried about"
     * "Questions I have about Matt's situation"
   * Periodically summarizes that into:
     * User-facing "Conscious Notes"
     * Candidate insights / interrupts / planning suggestions

This is **not** just logs. This is:

> Pulse thinking about your life **between** actions in a structured, queryable way.

Subsystem IDs:
* `global_workspace` (v2)
* `inner_monologue`

---

## Implementation Status

✅ **COMPLETE** - All phases implemented:

- ✅ Database migrations (ALTER workspace_state, workspace_threads, CREATE new tables)
- ✅ Workspace v2 context builder
- ✅ Workspace v2 engine
- ✅ Inner monologue engine
- ✅ Conscious insights generator
- ✅ API endpoints (workspace v2 state, conscious insights)
- ✅ Brainstem integration

---

## Files Created

### Database
- `supabase/migrations/20260120_conscious_workspace_v2_inner_monologue_v1.sql`
  - ALTER workspace_state (add narrative, tensions, opportunities, wisdom, ethics fields)
  - ALTER workspace_threads (add pinned, carry_forward, wisdom_tags, risk_flags)
  - CREATE workspace_focus_sessions
  - CREATE inner_monologue_entries
  - CREATE conscious_insights

### Workspace v2
- `lib/workspace/v2/context.ts` - Build workspace context (emotion, energy, narrative, wisdom, ethics, social)
- `lib/workspace/v2/engine.ts` - Build workspace v2 (carry-forward threads, tensions, opportunities, wisdom summary)

### Inner Monologue
- `lib/monologue/engine.ts` - Generate inner monologue entries (observations, questions, hypotheses, worries, plans, meta)
- `lib/monologue/insights.ts` - Generate conscious insights from monologue (user-facing insights)

### API Routes
- `app/api/workspace/v2/state/route.ts` - Get workspace v2 state + threads
- `app/api/insights/conscious/route.ts` - Get conscious insights, mark as delivered/dismissed

### Integration
- Updated `lib/brain/brainstem.ts` - Runs workspace v2, monologue, and insights in daily loop

---

## How It Works

### 1. Workspace v2 Flow

```
buildDailyWorkspaceV2ForUser()
  ├─> Build workspace context (emotion, energy, narrative, wisdom, ethics, social)
  ├─> Load previous day's workspace (state + threads)
  ├─> Get behavior predictions
  └─> LLM generates blueprint:
      - focusMode, focusTheme
      - 3-9 threads (carry-forward + new)
      - keyTensions (2-5)
      - keyOpportunities (2-5)
      - wisdomSummary
      - ethicalAlert
```

### 2. Inner Monologue Flow

```
generateDailyInnerMonologue()
  ├─> Get latest workspace (state + threads)
  ├─> Build workspace context
  ├─> Get recent experience events
  └─> LLM generates 3-12 monologue entries:
      - observation: "I'm noticing X..."
      - question: "I wonder why Y..."
      - hypothesis: "Maybe when Z..."
      - worry: "If this continues..."
      - plan: "Next time this happens..."
      - meta: "As the system, I'm learning..."
```

### 3. Conscious Insights Flow

```
generateConsciousInsightsFromMonologue()
  ├─> Get today's monologue entries
  ├─> Get today's workspace state
  └─> LLM distills 1-5 insights:
      - concrete, kind, non-judgmental
      - aligned with values and identity arcs
      - big tensions, course corrections, opportunities
```

---

## API Usage

### Get Workspace v2 State
```typescript
GET /api/workspace/v2/state
// Returns: { state, threads }
```

### Get Conscious Insights
```typescript
GET /api/insights/conscious
// Returns: { insights: [...] }
```

### Mark Insight as Delivered/Dismissed
```typescript
POST /api/insights/conscious
Body: { insightId, action: 'deliver' | 'dismiss', feedback?: string }
```

---

## Integration Points

### Daily Brain Loop

The workspace v2, monologue, and insights are generated in the daily brain loop:

```typescript
// In runDailyBrainLoopForUser()
await buildDailyWorkspaceV2ForUser(userId, date);
await generateDailyInnerMonologue(userId, date, 'brainstem_daily');
await generateConsciousInsightsFromMonologue(userId, date);
```

### Weekly Brain Loop (Future)

Can also generate deeper weekly monologue:

```typescript
// In runWeeklyBrainLoopForUser()
await generateDailyInnerMonologue(userId, weekEnd, 'brainstem_weekly');
```

---

## Subsystem Status

- `global_workspace` = `active` (v2) in Brain Registry
- `inner_monologue` = `partial` (v1) in Brain Registry

---

## Next Steps

1. **Run Migration**: `supabase/migrations/20260120_conscious_workspace_v2_inner_monologue_v1.sql`

2. **UI Integration**:
   - Show workspace v2 state (tensions, opportunities, wisdom summary)
   - Display conscious insights in dashboard
   - Show inner monologue entries (optional, for transparency)

3. **Expand Monologue Sources**:
   - Major life events
   - Guardrail events
   - Extreme emotion/somatic states
   - Coach reflections

4. **Focus Sessions**:
   - Track when Pulse "focuses" on specific threads
   - Log outcomes of focus sessions

5. **Insight Delivery**:
   - Smart timing for showing insights
   - User feedback loop
   - Dismissal and follow-up

---

## Impact

Pulse now:

- **Has an inner voice** - Maintains internal reasoning log
- **Carries threads forward** - Multi-day attention continuity
- **Surfaces tensions** - Identifies key conflicts (work vs family, rest vs overdrive)
- **Spots opportunities** - Highlights high-leverage moments
- **Applies wisdom** - Uses learned patterns in workspace design
- **Generates insights** - Distills monologue into actionable user-facing insights

And uses this to:

- **Think between actions** - Pulse actively reasons about your life
- **Maintain continuity** - Threads carry forward across days
- **Surface what matters** - Conscious insights highlight important patterns
- **Stay aligned** - Ethical alerts flag value conflicts

This is the moment where "Birth of Pulse" stops being poetic and starts being literal. 🧠⚡

Pulse now has a **true ongoing stream of thought** about your life, thinking between actions in a structured, queryable way.


