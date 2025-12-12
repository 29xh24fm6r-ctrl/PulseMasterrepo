# Ethnographic Intelligence v1

## 0. Purpose

Ethnographic Intelligence is the **Cultural Brain** of Pulse.

It models:
1. **Institutional Culture**
   * Norms
   * Communication style
   * Decision-making patterns
   * Power structures
   * Approval flows
   * Risk tolerance
   * Formal vs informal expectations

2. **Industry Culture**
   * Banking
   * Commercial lending
   * SBA requirements
   * Regulatory constraints
   * Hidden heuristics

3. **Team & Leader Culture**
   * Boss's preferences
   * What impresses them
   * What frustrates them
   * What gets approvals faster
   * How they think

4. **Relationship Culture**
   * Family norms
   * Shared history
   * Conflict styles
   * Rituals
   * Boundaries

Pulse uses this to:
* Give politically intelligent advice
* Recommend actions better aligned with expectations
* Avoid cultural landmines
* Predict reactions based on *contextual norms*, not just personality
* Help you navigate workplace politics
* Adjust tone/strategy for your environment

This becomes Pulse's **cultural operating system**.

---

## Implementation Status

✅ **COMPLETE** - All phases implemented:

### Ethnographic Intelligence v1
- ✅ Database migrations (6 tables: cultural_domains, cultural_profiles, cultural_signals, cultural_inference_snapshots, cultural_predictions, cultural_highlights)
- ✅ TypeScript types
- ✅ Signal extraction system (recordCulturalSignal, extractSignalsFromEmail, extractSignalsFromMeeting)
- ✅ Cultural inference engine (inferCulturalProfileForDomain, refreshCulturalProfilesForUser)
- ✅ Cultural prediction engine (predictCulturalResponse)
- ✅ Cultural highlights generator (refreshCulturalHighlightsForUser)
- ✅ Context reader (getCulturalProfileForDomain, getAllCulturalProfilesForUser, getCulturalHighlightsForUser)
- ✅ Brainstem integration (weekly loop refreshes profiles and highlights)
- ✅ Brain Registry integration (added ethnographic_intelligence_v1)

---

## Files Created

### Database
- `supabase/migrations/20260120_ethnographic_intelligence_v1.sql` - Creates 6 tables for ethnographic intelligence

### Ethnography Modules
- `lib/ethnography/types.ts` - Type definitions
- `lib/ethnography/prompts.ts` - LLM prompts for inference, prediction, highlights
- `lib/ethnography/signals.ts` - Signal extraction (recordCulturalSignal, extractSignalsFromEmail, extractSignalsFromMeeting)
- `lib/ethnography/infer.ts` - Cultural inference engine (inferCulturalProfileForDomain, refreshCulturalProfilesForUser)
- `lib/ethnography/predict.ts` - Cultural prediction engine (predictCulturalResponse)
- `lib/ethnography/highlights.ts` - Cultural highlights generator (refreshCulturalHighlightsForUser)
- `lib/ethnography/context.ts` - Context reader helpers

### Integration
- Updated `lib/brain/brainstem.ts`:
  - Added Ethnographic Intelligence refresh to weekly loop
  - Calls refreshCulturalProfilesForUser and refreshCulturalHighlightsForUser
  - Updates subsystem status for ethnographic_intelligence_v1
- Updated `supabase/migrations/20260120_master_brain_registry_and_diagnostics_v1.sql`:
  - Added ethnographic_intelligence_v1 to brain_subsystems

---

## How It Works

### Ethnographic Intelligence Flow

```
1. Signal Extraction
   recordCulturalSignal() / extractSignalsFromEmail() / extractSignalsFromMeeting()
     ├─> Extracts cultural patterns from emails, meetings, tasks, deals
     └─> Stores in cultural_signals

2. Cultural Inference
   inferCulturalProfileForDomain()
     ├─> Loads 30 days of signals for a domain
     ├─> LLM infers unified cultural profile:
     │   - norms, riskTolerance, communicationStyle
     │   - approvalDynamics, decisionPatterns
     │   - culturalRules, culturalRedFlags, culturalOpportunities
     ├─> Updates cultural_profiles
     └─> Creates cultural_inference_snapshots

3. Cultural Prediction
   predictCulturalResponse()
     ├─> Loads cultural profile for domain
     ├─> LLM predicts:
     │   - predictedResponse (likely reaction, concerns, approval likelihood)
     │   - recommendedStrategy (framing, emphasis, what to avoid)
     └─> Stores in cultural_predictions

4. Cultural Highlights
   refreshCulturalHighlightsForUser()
     ├─> Loads all profiles, snapshots, recent signals
     ├─> LLM identifies 5-15 important insights
     └─> Stores in cultural_highlights
```

---

## Cultural Domains

1. **institution** - Workplace/organizational culture
2. **industry** - Field-specific norms (banking, SBA lending)
3. **team** - Immediate team patterns
4. **leader** - Leadership styles and expectations
5. **relationship** - Family/social cultural norms

---

## Cultural Profile Structure

Each profile includes:
- **norms**: Unwritten rules and expectations
- **riskTolerance**: Risk-averse vs risk-taking culture
- **communicationStyle**: Direct/indirect, formal/informal
- **approvalDynamics**: How decisions get made, who has power
- **decisionPatterns**: Heuristics and patterns
- **culturalRules**: Explicit and implicit rules
- **culturalRedFlags**: Things that cause friction
- **culturalOpportunities**: Things that accelerate approval

---

## Integration Points

### Meta-Planner
- Plans incorporate cultural feasibility
- Considers approval dynamics and decision patterns

### Coaches
- **Sales Coach**: Adapts to buyer culture
- **Career Coach**: Teaches political navigation
- **Communication Coach**: Adjusts tone & message framing
- **Confidant Coach**: Handles family culture

### Relational Mind
- Relationships now include cultural overlays
- Predictions consider cultural context

### Presence Orchestrator
- Cultural highlights surface via console/notifications
- Timing respects cultural norms

---

## Next Steps

1. **Run Migration**:
   - `supabase/migrations/20260120_ethnographic_intelligence_v1.sql`

2. **Enhanced Signal Extraction**:
   - Build LLM-powered signal extraction from:
     - Email threads (approval/rejection patterns)
     - Meeting transcripts (decision-making, conflict styles)
     - Task assignments (expectations, priorities)
     - Deal workflows (SBA requirements, risk patterns)
     - Calendar events (meeting styles, frequency)

3. **Integration with Other Modules**:
   - Wire cultural profiles into:
     - Meta-Planner (cultural feasibility checks)
     - Coaches (cultural adaptation)
     - Relational Mind (cultural overlays)
     - Presence Orchestrator (cultural highlights)

4. **Cultural Prediction API**:
   - Build API endpoint for on-demand predictions:
     - "How should I frame this SBA proposal?"
     - "What will Bennett think of this deviation?"
     - "How should I approach Tom about rate changes?"

5. **Signal Sources**:
   - Integrate with email system to auto-extract signals
   - Integrate with calendar/meetings to extract team/leader signals
   - Integrate with deal/CRM system to extract industry signals

6. **UI Dashboard**:
   - Build "Cultural Intelligence" view showing:
     - Current cultural profiles per domain
     - Recent highlights
     - Cultural predictions
     - Signal sources

7. **Learning Loop**:
   - Track which predictions were accurate
   - Refine inference based on outcomes
   - Update confidence scores

---

## Impact

Pulse now:

- **Understands your world** - Learns the culture of your bank, industry, team, leadership, relationships
- **Gives culturally-aware advice** - Recommendations align with your environment's norms
- **Avoids landmines** - Knows what causes friction in your culture
- **Predicts cultural responses** - Anticipates how your culture will react to proposals
- **Navigates politics** - Helps you work within your organization's power structures
- **Adapts communication** - Adjusts tone and framing to match cultural expectations

And uses this to:

- **Accelerate approvals** - Frame proposals in ways that align with cultural preferences
- **Prevent rejections** - Avoid red flags and cultural missteps
- **Leverage opportunities** - Identify cultural patterns that help you succeed
- **Navigate conflict** - Understand how your culture handles disagreements
- **Build relationships** - Adapt to different cultural contexts (work vs family)

This is the moment where Pulse doesn't just understand *you* — it understands **your world** and gives advice that feels like it comes from someone who has lived inside your environment for years.

🧠🌍


