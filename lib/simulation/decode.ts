// Decode Simulation to Insights
// lib/simulation/decode.ts

import { llmComplete } from "@/lib/llm/client";
import { DigitalTwinState } from "./twin";
import { SimulationStep } from "./scenario";

export interface SimulationOutput {
  summary: string;                      // LLM summary
  risks: {
    burnout: number;
    relapse: number;
    conflict: number;
  };
  opportunities: {
    fastest_growth_area: string;
    major_unlocks: string[];
  };
  arcForecast: {
    healing: number;
    career: number;
    performance: number;
    identity: number;
  };
  metrics: Array<{
    day: number;
    energy: number;
    stress: number;
    mood: number;
    career_velocity: number;
    arc_healing: number;
    arc_career: number;
    risk_burnout: number;
  }>;
}

/**
 * Decode simulation steps into insights
 */
export async function decodeSimulationToOutput(
  initialTwin: DigitalTwinState,
  steps: SimulationStep[],
  scenarioName: string,
  adjustments?: any
): Promise<SimulationOutput> {
  const finalState = steps[steps.length - 1]?.state || initialTwin;

  // Extract metrics for charting
  const metrics = steps.map((step) => ({
    day: step.day,
    energy: step.state.energy,
    stress: step.state.stress,
    mood: step.state.mood,
    career_velocity: step.state.career_velocity,
    arc_healing: step.state.arc_momentum.healing,
    arc_career: step.state.arc_momentum.career,
    risk_burnout: step.state.risk.burnout,
  }));

  // Build LLM prompt for summary
  const prompt = `You are analyzing a life simulation scenario. This is NOT a prediction or guarantee - it's a conceptual model based on patterns.

Scenario: ${scenarioName}
Duration: ${steps.length} days
Adjustments: ${JSON.stringify(adjustments || {})}

Initial State:
- Energy: ${initialTwin.energy}
- Stress: ${initialTwin.stress}
- Mood: ${initialTwin.mood}
- Career Velocity: ${initialTwin.career_velocity}
- Healing Arc Momentum: ${initialTwin.arc_momentum.healing}
- Career Arc Momentum: ${initialTwin.arc_momentum.career}
- Burnout Risk: ${initialTwin.risk.burnout}

Final State:
- Energy: ${finalState.energy}
- Stress: ${finalState.stress}
- Mood: ${finalState.mood}
- Career Velocity: ${finalState.career_velocity}
- Healing Arc Momentum: ${finalState.arc_momentum.healing}
- Career Arc Momentum: ${finalState.arc_momentum.career}
- Burnout Risk: ${finalState.risk.burnout}

Key Changes:
- Energy: ${(finalState.energy - initialTwin.energy).toFixed(1)}
- Stress: ${(finalState.stress - initialTwin.stress).toFixed(1)}
- Career Velocity: ${(finalState.career_velocity - initialTwin.career_velocity).toFixed(1)}

Generate a safe, probabilistic summary (2-3 paragraphs) that:
1. Describes what this scenario MAY lead to (use "may", "could", "tends", "is associated with")
2. Highlights key risks (burnout, relapse, conflict) if they increase
3. Identifies opportunities for growth
4. Emphasizes this is a conceptual model, not a guarantee
5. Avoids absolute predictions or medical advice

Output JSON:
{
  "summary": "Your summary text",
  "fastest_growth_area": "e.g. 'Career velocity' or 'Emotional resilience'",
  "major_unlocks": ["Unlock 1", "Unlock 2"]
}`;

  try {
    const response = await llmComplete(prompt, {
      model: "gpt-4o-mini",
      temperature: 0.7,
      json: true,
      max_tokens: 500,
    });

    const parsed = typeof response === "string" ? JSON.parse(response) : response;

    return {
      summary: parsed.summary || "This scenario shows potential outcomes based on your current patterns.",
      risks: {
        burnout: finalState.risk.burnout,
        relapse: finalState.risk.relapse,
        conflict: finalState.risk.conflict,
      },
      opportunities: {
        fastest_growth_area: parsed.fastest_growth_area || "Multiple areas",
        major_unlocks: parsed.major_unlocks || [],
      },
      arcForecast: {
        healing: finalState.arc_momentum.healing,
        career: finalState.arc_momentum.career,
        performance: finalState.arc_momentum.performance,
        identity: finalState.arc_momentum.identity,
      },
      metrics,
    };
  } catch (err) {
    console.error("[SimulationDecode] Failed to generate summary:", err);
    // Fallback summary
    return {
      summary: `This ${steps.length}-day scenario shows how your life patterns may evolve. This is a conceptual model based on your current state, not a guarantee. Key changes: Energy ${(finalState.energy - initialTwin.energy).toFixed(1)}, Stress ${(finalState.stress - initialTwin.stress).toFixed(1)}, Career Velocity ${(finalState.career_velocity - initialTwin.career_velocity).toFixed(1)}.`,
      risks: {
        burnout: finalState.risk.burnout,
        relapse: finalState.risk.relapse,
        conflict: finalState.risk.conflict,
      },
      opportunities: {
        fastest_growth_area: "Multiple areas",
        major_unlocks: [],
      },
      arcForecast: {
        healing: finalState.arc_momentum.healing,
        career: finalState.arc_momentum.career,
        performance: finalState.arc_momentum.performance,
        identity: finalState.arc_momentum.identity,
      },
      metrics,
    };
  }
}




