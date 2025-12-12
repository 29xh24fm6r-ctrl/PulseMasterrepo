# Boardroom Brain v1 - Strategic Mind + Executive Council + Decision Theater

## Implementation Status

✅ **COMPLETE** - All phases implemented:

### Database Schema
- ✅ 9 tables created:
  - strategic_domains
  - strategic_objectives
  - strategic_playbooks (seeded with 4 defaults)
  - strategic_plans
  - decisions
  - decision_options
  - executive_council_members
  - executive_council_votes
  - decision_scenarios

### Core Modules
- ✅ `lib/boardroom/types.ts` - Type definitions
- ✅ `lib/boardroom/strategic_mind.ts` - Strategic Mind core
- ✅ `lib/boardroom/council.ts` - Executive Council engine
- ✅ `lib/boardroom/decision_theater.ts` - Decision Theater engine
- ✅ `lib/boardroom/orchestrator.ts` - Full boardroom review orchestrator

### API Endpoints
- ✅ `GET/POST /api/boardroom/domains` - Domain CRUD
- ✅ `GET/POST /api/boardroom/objectives` - Objective CRUD
- ✅ `POST /api/boardroom/plan/suggest-playbooks` - Suggest playbooks
- ✅ `POST /api/boardroom/plan/generate` - Generate strategic plan
- ✅ `POST /api/boardroom/decisions` - Create decision
- ✅ `GET /api/boardroom/decisions/[id]` - Get decision details
- ✅ `POST /api/boardroom/decisions/[id]/review` - Run boardroom review
- ✅ `POST /api/boardroom/decisions/[id]/choose` - Choose decision
- ✅ `GET /api/boardroom/council/members` - Get council members

### Integration
- ✅ Brain Registry entry added (`boardroom_brain_v1`)

---

## Overview

Boardroom Brain v1 is a unified system that combines:

1. **Strategic Mind** - Turns goals, constraints, and landscape into coherent strategies & plays
2. **Executive Council** - Multiple advisor personas (CFO, Risk Officer, Strategist, etc.) that "vote" on big decisions
3. **Decision Theater** - Visualizes scenarios/branches and runs what-if simulations

---

## Database Schema

### Strategic Planning
- **strategic_domains** - High-level areas (Career, Pulse OS, Banking Deals, etc.)
- **strategic_objectives** - Concrete objectives within domains
- **strategic_playbooks** - Reusable strategy patterns (Land & Expand, Fortress Balance Sheet, etc.)
- **strategic_plans** - Concrete plan instances for objectives

### Decision Making
- **decisions** - Big decisions to run through Boardroom Brain
- **decision_options** - Options within a decision
- **executive_council_members** - Advisor personas (CFO, Risk Officer, etc.)
- **executive_council_votes** - Votes per decision per member
- **decision_scenarios** - Scenario runs (base, upside, downside)

---

## Core Functionality

### Strategic Mind

`suggestStrategicPlaybooks()`:
- Analyzes objective and constraints
- Ranks available playbooks by fit
- Returns top 3-5 recommendations

`generateStrategicPlanDraft()`:
- Uses selected playbook
- Generates plan with summary, assumptions, risk register
- Creates draft strategic plan

**Seeded Playbooks:**
1. **Land & Expand** - Start with one customer, then expand
2. **Fortress Balance Sheet** - Build financial foundation first
3. **Beachhead Niche** - Dominate small niche before expanding
4. **Strategic Pivot** - Shift direction when current path isn't working

### Executive Council

`ensureDefaultCouncilSeeded()`:
- Seeds 5 default council members:
  - **CFO** - Cash flow & downside focus
  - **Chief Risk Officer** - Tail risk, reputation, regulatory
  - **Strategic General** - Big-picture competitive advantage
  - **Human/Family Advocate** - Stress, relationships, energy
  - **Future Self (3-5 years)** - Long-term compounding & identity

`runCouncilVote()`:
- For each active member, generates persona-specific vote
- Each vote includes: chosen option, rationale, concerns, confidence
- Generates aggregate summary

### Decision Theater

`generateDecisionScenarios()`:
- For each decision option, generates 3 scenarios:
  - **Base case** - Most likely outcome
  - **Upside** - Best-case scenario
  - **Downside** - Worst-case scenario
- Each scenario includes:
  - Narrative summary
  - Risk score (0-10)
  - Outcome metrics (cash flow, freedom, optionality, relationship strain)

### Orchestrator

`runBoardroomReview()`:
1. Ensures default council seeded
2. Runs council vote
3. Generates decision scenarios
4. Synthesizes recommendation from votes + scenarios
5. Returns full boardroom review

---

## API Endpoints

### Strategic Planning

#### GET /api/boardroom/domains
Returns active strategic domains.

#### POST /api/boardroom/domains
Creates a new domain.

**Body:**
```json
{
  "name": "Career",
  "slug": "career",
  "description": "Career strategy"
}
```

#### GET /api/boardroom/objectives
Returns active strategic objectives.

#### POST /api/boardroom/objectives
Creates a new objective.

**Body:**
```json
{
  "domainId": "uuid",
  "name": "Grow Pulse to 1,000 users",
  "description": "...",
  "timeframeStart": "2025-01-01",
  "timeframeEnd": "2025-12-31",
  "priority": 1,
  "successMetrics": ["MRR >= X"]
}
```

#### POST /api/boardroom/plan/suggest-playbooks
Suggests playbooks for an objective.

**Body:**
```json
{
  "objectiveId": "uuid"
}
```

**Response:**
```json
{
  "playbooks": [...]
}
```

#### POST /api/boardroom/plan/generate
Generates a strategic plan draft.

**Body:**
```json
{
  "objectiveId": "uuid",
  "playbookId": "uuid"
}
```

**Response:**
```json
{
  "plan": {...}
}
```

### Decision Making

#### POST /api/boardroom/decisions
Creates a decision.

**Body:**
```json
{
  "title": "Take this SBA deal?",
  "description": "...",
  "domainId": "uuid",
  "objectiveId": "uuid",
  "options": [
    { "label": "Yes", "description": "Proceed now" },
    { "label": "No", "description": "Decline" }
  ],
  "context": { "dealId": "uuid" },
  "importance": 1
}
```

#### GET /api/boardroom/decisions/[id]
Returns decision with options, votes, scenarios.

#### POST /api/boardroom/decisions/[id]/review
Runs full boardroom review.

**Response:**
```json
{
  "council": {
    "votes": [...],
    "aggregateSummary": "..."
  },
  "scenarios": [...],
  "recommendedOptionId": "uuid",
  "recommendedSummary": "..."
}
```

#### POST /api/boardroom/decisions/[id]/choose
User confirms decision.

**Body:**
```json
{
  "optionId": "uuid"
}
```

### Council

#### GET /api/boardroom/council/members
Returns active council members.

---

## Integration Points

### Weekly Planner
- Pulls top 3 objectives + next moves
- Adds "Strategic Actions" section
- 2-5 tasks per week linked to strategic plans

### Deals / CRM
- "Send to Boardroom" button on deal page
- Creates decision with deal context
- Uses Deal Archetype + Financials in council/scenarios

### Mythic Intelligence Layer
- Uses `user_mythic_profile` in Future Self persona
- Scenario narrative flavor (fits into current life chapter)
- Shows mythic line in Decision Theater

### Autopilot
- After decision chosen, gets structured payload
- Creates tasks/campaigns automatically

---

## Next Steps

### Frontend UI

#### `/app/boardroom/page.tsx` - Boardroom Hub
- Current strategic domains (chips)
- Today's Strategic Focus (top objectives + active plans)
- Open Decisions Widget

#### `/app/boardroom/decisions/[id]/page.tsx` - Decision Theater
- Left: Decision Summary
- Middle: Scenarios Grid (base/upside/downside per option)
- Right: Executive Council (votes + recommendation)
- Toolbar: Re-run review, Send to Weekly Plan

#### `/app/boardroom/objectives/[id]/page.tsx` - Strategic Mind View
- Objective details
- Associated strategic plans
- Playbook suggestions
- Plan detail view

### Enhanced Features
- More sophisticated scenario simulation (integrate with Life Simulation Engine)
- Council member customization
- Playbook library expansion
- Integration with Weekly Planner and Autopilot

---

## Impact

Pulse now has a **Boardroom Brain** that:

1. **Strategic Planning** - Turns goals into actionable strategies
2. **Multi-Persona Decision Making** - Multiple advisors vote on decisions
3. **Scenario Visualization** - See outcomes before deciding
4. **Unified Intelligence** - Combines Strategic Mind + Council + Theater

This is the moment Pulse becomes a **strategic decision-making system** that helps users make big decisions with multiple perspectives and scenario analysis.

🧠✨


