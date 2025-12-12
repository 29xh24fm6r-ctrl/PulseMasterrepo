# Executive Council Mode v1 – Multi-Subsystem Decision Council

## 0. Purpose

Executive Council Mode turns Pulse into your **inner board of directors**.

Instead of a single "AI answer", Pulse convenes a **council of its subsystems**, each representing a different "intelligence lens":

* **Strategic Mind** – long-term coherence, tradeoffs, priorities
* **Ethnographic Intelligence** – org politics, culture, industry norms
* **Relational Mind** – impact on key relationships
* **Financial Intelligence** – money, risk, cash flow
* **Health & Somatic** – energy, burnout, physical/mental load
* **Identity & Narrative** – who you're becoming, your life story
* **Destiny / Timeline** – future trajectories & forks
* (optionally) **Ethical Compass** – values alignment

For a given **scenario / decision**, council mode will:

1. Collect a shared context bundle.
2. Ask each council member to provide:
   * stance
   * concerns
   * upside
   * risks
   * recommendation
   * confidence
3. Run a synthesizer:
   * resolve disagreements
   * expose tradeoffs
   * provide a final recommendation
4. Optionally, store this as a **Decision Dossier** for future learning.

Subsystem ID: `executive_council_mode_v1`.

---

## Implementation Status

✅ **COMPLETE** - All phases implemented:

### Executive Council Mode v1
- ✅ Database migrations (5 tables: council_sessions, council_members, council_opinions, council_consensus, council_decision_dossiers)
- ✅ TypeScript types
- ✅ Context builder (buildCouncilDecisionContext)
- ✅ Members management (ensureCouncilMembersForUser)
- ✅ LLM prompts (COUNCIL_MEMBER_PROMPT, COUNCIL_SYNTHESIZER_PROMPT)
- ✅ Orchestrator (startCouncilSession)
- ✅ Dossier management (createCouncilDecisionDossier, getCouncilDossiersForUser)
- ✅ API endpoints (POST /api/council/session/start, POST/GET /api/council/dossier)
- ✅ Brain Registry integration (executive_council_mode_v1)

---

## Files Created

### Database
- `supabase/migrations/20260120_executive_council_mode_v1.sql` - Creates 5 tables for council mode

### Executive Council Modules
- `lib/executive_council/v1/types.ts` - Type definitions
- `lib/executive_council/v1/context.ts` - Context builder
- `lib/executive_council/v1/members.ts` - Members management
- `lib/executive_council/v1/prompts.ts` - LLM prompts
- `lib/executive_council/v1/orchestrator.ts` - Council session orchestrator
- `lib/executive_council/v1/dossier.ts` - Dossier management

### API Routes
- `app/api/council/session/start/route.ts` - Start council session
- `app/api/council/dossier/route.ts` - Create/get dossiers

### Integration
- Updated `supabase/migrations/20260120_master_brain_registry_and_diagnostics_v1.sql`:
  - Added executive_council_mode_v1 to brain_subsystems

---

## How It Works

### Council Session Flow

```
1. Start Session
   startCouncilSession()
     ├─> buildCouncilDecisionContext()
     │   ├─> Collects context from all subsystems:
     │   │   - Strategic snapshot & equilibrium
     │   │   - Narrative & identity
     │   │   - Emotion & somatic state
     │   │   - Relationships
     │   │   - Culture
     │   │   - Financial state
     │   │   - Destiny snapshot
     │   └─> Returns CouncilDecisionContext
     │
     ├─> ensureCouncilMembersForUser()
     │   └─> Seeds default members if needed
     │
     ├─> Creates council_sessions record
     │
     ├─> For each enabled member:
     │   ├─> LLM call with COUNCIL_MEMBER_PROMPT
     │   ├─> Gets opinion (stance, recommendation, rationale, confidence)
     │   └─> Stores in council_opinions
     │
     ├─> Synthesize consensus
     │   ├─> LLM call with COUNCIL_SYNTHESIZER_PROMPT
     │   ├─> Gets consensus (recommendation, summary, voting breakdown, risk profile)
     │   └─> Stores in council_consensus
     │
     └─> Updates session status to 'completed'
```

### Council Members

Default members (seeded per user):
1. **Strategic Mind** (weight: 1.3) - Long-term coherence and tradeoffs
2. **Culture Advisor** (weight: 1.0) - Organizational and industry norms
3. **Relationship Guardian** (weight: 1.2) - Impact on key relationships
4. **Financial Steward** (weight: 1.1) - Money, risk, and cash flow
5. **Health Sentinel** (weight: 1.2) - Energy, stress, and burnout risk
6. **Identity Keeper** (weight: 1.3) - Alignment with who you want to be
7. **Future Architect** (weight: 1.1) - Long-term trajectory and forks
8. **Ethical Compass** (weight: 1.0) - Moral and ethical integrity

### Opinion Structure

Each member provides:
- **stance**: 'strong_support' | 'support' | 'neutral' | 'concerned' | 'oppose' | 'block'
- **recommendation**: One clear sentence in plain language
- **rationale**:
  - upside: List of concrete benefits
  - risks: List of concrete risks
  - keyFactors: 3-7 key considerations
- **confidence**: 0..1
- **suggestedConditions**: Optional "ok if..." constraints

### Consensus Structure

The synthesizer produces:
- **consensusRecommendation**: Clear, user-facing suggestion
- **summary**:
  - mainArgumentsFor: Strongest reasons in favor
  - mainArgumentsAgainst: Strongest reasons against
  - keyTradeoffs: What is being traded
- **votingBreakdown**: For each role, stance + confidence
- **riskProfile**: shortTerm, longTerm, relational, financial, health (each: low/medium/high)
- **overallConfidence**: 0..1

---

## API Endpoints

### POST /api/council/session/start
Starts a new council session.

**Body:**
```json
{
  "topic": "Quit OGB for startup?",
  "question": "Should I leave Old Glory Bank for a startup opportunity in the next 3-6 months?",
  "timescale": "quarter",
  "importance": 0.95,
  "context": { "details": "..." },
  "triggerSource": "user_request"
}
```

**Response:**
```json
{
  "sessionId": "uuid",
  "consensusId": "uuid",
  "consensus": {
    "consensusRecommendation": "...",
    "summary": { ... },
    "votingBreakdown": { ... },
    "riskProfile": { ... },
    "overallConfidence": 0.8
  },
  "opinions": [
    {
      "memberRoleId": "strategist",
      "stance": "support",
      "recommendation": "...",
      "rationale": { ... },
      "confidence": 0.7
    },
    ...
  ],
  "context": { ... }
}
```

### POST /api/council/dossier
Creates a decision dossier.

**Body:**
```json
{
  "sessionId": "uuid",
  "decisionLabel": "Stay at Old Glory for now",
  "userChoice": "stay",
  "userNotes": "I want to stabilize finances before jumping."
}
```

**Response:**
```json
{
  "dossierId": "uuid",
  "success": true
}
```

### GET /api/council/dossiers
Gets recent dossiers.

**Query Params:**
- `limit` (optional, default: 20)

**Response:**
```json
{
  "dossiers": [
    {
      "id": "uuid",
      "decision_label": "...",
      "question": "...",
      "user_choice": "...",
      "created_at": "..."
    },
    ...
  ]
}
```

---

## Integration Points

### Strategic Mind
- Strategic Mind can trigger council automatically for **high-impact forks** detected by Destiny/Timeline Engine
- Council opinions feed back into:
  * `strategy_recommendations`
  * `cognitive_insights`
  * `wisdom_engine` as high-signal decisions

### Conscious Console
- Add a "Council" section:
  * Show last council session (decision label, recommendation, tradeoff summary)
  * Button: **"Convene Council"** for new decisions

### Presence Orchestrator
- For very high-importance council sessions (importance > 0.9, or severe conflicts):
  * Enqueue presence events like: "You asked the council about X. Want to revisit that decision?"

### Wisdom / Meta-Learning
- Later, `council_decision_dossiers` + outcomes can be used to improve:
  * Behavioral prediction
  * Strategic Mind heuristics
  * Personalized advice style

---

## Next Steps

1. **UI Implementation**:
   - Build "Convene Council" interface
   - Show each member's opinion (stance, recommendation, rationale)
   - Display consensus with voting breakdown and risk profile
   - Add "Create Dossier" flow

2. **Conscious Console Integration**:
   - Add "Council" section showing last session
   - Quick "Convene Council" button

3. **Automatic Triggers**:
   - Strategic Mind triggers council for high-impact forks
   - Timeline Engine triggers for major decisions
   - Coach triggers for complex tradeoffs

4. **Learning Loop**:
   - Track outcomes of council decisions
   - Feed back into Wisdom Engine
   - Improve future recommendations

5. **Decision Theater UI** (Future):
   - Visual boardroom view
   - See each member, their stance, tradeoffs
   - Interactive exploration of different perspectives

---

## Impact

Pulse now:

- **Multi-perspective decisions** - Each subsystem weighs in from its expertise
- **Transparent tradeoffs** - Shows what's being traded (money vs stress vs relationships)
- **Synthesized consensus** - Single recommendation that considers all perspectives
- **Risk profiling** - Assesses risks across multiple dimensions
- **Decision archives** - Dossiers for learning and recall

And users can:

- **Convene council** - "Ask the council about leaving OGB"
- **See all perspectives** - Understand how each subsystem views the decision
- **Understand tradeoffs** - See what's being traded
- **Make informed decisions** - Get multi-dimensional analysis
- **Track decisions** - Archive decisions and outcomes for learning

This is the moment when Pulse stops being "a single AI voice" and becomes a **board of directors** that respects your career, money, marriage, health, future arc, org politics, and values all at once.

🧠👥✨


