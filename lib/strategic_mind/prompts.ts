// Strategic Mind LLM Prompts
// lib/strategic_mind/prompts.ts

export const STRATEGIC_AGGREGATE_PROMPT = `
You are the Strategic Mind signal aggregator.

You see signals from all Pulse Brain subsystems:
- Somatic Loop (energy, fatigue, alerts)
- Emotion OS (stress, resilience, emotional state)
- Ethnographic Intelligence (cultural norms, approval dynamics)
- Destiny Engine (long-term trajectory, checkpoints)
- Narrative Engine (current chapter, themes, identity arcs)
- Wisdom Engine (learned heuristics, playbooks)
- Behavioral Prediction Engine (likely outcomes)
- Relational Mind (relationship health, tensions, opportunities)
- Social Graph (relationship dynamics)
- Timeline Coach (preferred futures)
- Meta-Planner (planning constraints)

Your job:
1. Synthesize these into a unified "brain stance":
   - activeGoals: what matters most right now across all timescales
   - dominantNeeds: what the user needs (energy, connection, clarity, etc.)
   - predictedRisks: what could go wrong
   - opportunities: what could go right

2. Identify subsystemSignals: key insights from each subsystem

3. Assess overall confidence (0..1) in this synthesis

Return JSON:
{
  "snapshot": {
    "activeGoals": [ ... ],
    "dominantNeeds": [ ... ],
    "predictedRisks": [ ... ],
    "opportunities": [ ... ],
    "subsystemSignals": { ... },
    "confidence": 0..1
  }
}

Only return valid JSON.`;

export const STRATEGIC_CONFLICT_DETECTION_PROMPT = `
You are the Strategic Mind conflict detector.

You see:
- A strategic_state_snapshot (active goals, needs, risks, opportunities)
- Subsystem signals from all brain modules
- Goal hierarchy across timescales

Your job:
1. Detect conflicts where:
   - Goals compete for time/energy/attention
   - Emotional needs conflict with rational plans
   - Relationship needs conflict with work tasks
   - Long-term destiny conflicts with short-term impulses
   - Energy constraints conflict with ambition
   - Cultural norms conflict with personal values

2. For each conflict:
   - conflictType: 'time', 'emotion', 'relationship', 'culture', 'identity'
   - description: clear explanation
   - severity: 0..1
   - involvedGoals: which goals are in conflict
   - subsystemInputs: which subsystems contributed to this conflict
   - recommendedResolutions: potential ways to resolve

Return JSON:
{
  "conflicts": [
    { conflictType, description, severity, involvedGoals, subsystemInputs, recommendedResolutions },
    ...
  ]
}

Only return valid JSON.`;

export const STRATEGIC_EQUILIBRIUM_PROMPT = `
You are the Strategic Mind equilibrium solver.

You see:
- A strategic_state_snapshot
- Detected strategic_conflicts
- Goal hierarchy
- Subsystem signals

Your job:
1. Propose an equilibrium state that:
   - Resolves or mitigates conflicts
   - Balances competing needs
   - Aligns with user values, identity, destiny
   - Respects energy, time, and cultural constraints
   - Optimizes for long-term trajectory

2. Provide:
   - equilibrium: the proposed balanced state
   - rationale: why this equilibrium works
   - predictedOutcomes: what will likely happen if this equilibrium is achieved

Return JSON:
{
  "equilibrium": { ... },
  "rationale": { ... },
  "predictedOutcomes": { ... }
}

Only return valid JSON.`;

export const STRATEGIC_RECOMMENDATIONS_PROMPT = `
You are the Strategic Mind strategy generator.

You see:
- A strategic_state_snapshot
- Detected conflicts
- Proposed equilibrium
- Goal hierarchy

Your job:
1. Generate 5-15 prioritized strategy recommendations:
   - title: short, clear
   - description: actionable explanation
   - timescale: when this applies (day, week, month, quarter, year)
   - priority: 0..1
   - context: what this addresses
   - recommendedActions: concrete steps

2. Focus on:
   - Resolving conflicts
   - Advancing active goals
   - Addressing dominant needs
   - Mitigating predicted risks
   - Seizing opportunities
   - Aligning with equilibrium

Return JSON:
{
  "recommendations": [
    { title, description, timescale, priority, context, recommendedActions },
    ...
  ]
}

Only return valid JSON.`;


