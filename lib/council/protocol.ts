// Council Protocol - Debate/Analysis
// lib/council/protocol.ts

import { llmComplete } from "@/lib/llm/client";
import { CouncilAnalysis, CouncilSynthesis, CouncilSynthesisInput, CouncilMode } from "./types";
import { PersonaProfile } from "@/lib/personas/types";

export interface RunCoachLLMAnalysisParams {
  coachId: string;
  persona: PersonaProfile;
  userInput: string;
  userModel?: any;
  councilMode: CouncilMode;
  lifeArcs?: Array<{ name: string; description?: string; priority: number }>;
}

/**
 * Run individual coach analysis
 */
export async function runCoachLLMAnalysis(
  params: RunCoachLLMAnalysisParams
): Promise<CouncilAnalysis> {
  const { coachId, persona, userInput, userModel, councilMode, lifeArcs, userId } = params;

  const coachDescriptions: Record<string, string> = {
    confidant: "You are a Confidant Coach - a trusted advisor who provides emotional support, validation, and gentle guidance.",
    emotional: "You are an Emotional Coach focused on emotional intelligence, self-awareness, and managing difficult feelings.",
    career: "You are a Career Coach, helping the user advance in their professional journey, achieve mastery, and complete career missions.",
    sales: "You are a Sales Coach focused on helping users improve their sales skills, handle objections, and close deals effectively.",
    motivational: "You are a Motivational Coach who energizes and pushes users to excel.",
    autopilot: "You are an Autopilot Coach, providing concise, actionable guidance to help the user manage tasks and optimize their workflow.",
    planner: "You are a Planner Coach who helps users think long-term, anticipate challenges, and plan strategically.",
    identity: "You are an Identity Coach who helps users understand their core values, roles, and authentic self.",
    simulation: "You are a Simulation Coach who helps users explore different scenarios and outcomes.",
  };

  let systemPrompt = `${coachDescriptions[coachId] || "You are a supportive AI coach."}

You are participating in a Coach Council to help the user with: ${userInput}

Council Mode: ${councilMode}

Your persona style:
- Energy: ${persona.style.energy}
- Warmth: ${persona.style.warmth}
- Directiveness: ${persona.style.directiveness}

User Context:
${userModel ? JSON.stringify(userModel, null, 2) : "No additional context"}`;

  // Add life arcs context if provided
  if (params.lifeArcs && params.lifeArcs.length > 0) {
    systemPrompt += `\n\nUser's Active Life Arcs (Main Quests):\n${params.lifeArcs
      .map((arc, idx) => `${idx + 1}. ${arc.name} (Priority ${arc.priority})${arc.description ? ` - ${arc.description}` : ""}`)
      .join("\n")}\n\nYour answer should respect these arcs and, when possible, move them forward.`;
  }

  // Add weekly objectives and daily focus if available
  if (userId) {
    try {
      const { getWeeklyObjectives, getDailyFocus } = await import("@/lib/life-arc/autopilot/integration");
      const weeklyObjs = await getWeeklyObjectives(userId);
      const dailyFocus = await getDailyFocus(userId);

      if (weeklyObjs.length > 0) {
        systemPrompt += `\n\nThis Week's Life Arc Objectives:\n${weeklyObjs
          .map((obj) => `- ${obj.summary} (Target: ${obj.targetQuests} quests)`)
          .join("\n")}`;
      }

      if (dailyFocus.length > 0) {
        systemPrompt += `\n\nToday's Life Focus:\n${dailyFocus
          .slice(0, 5)
          .map((f) => `- ${f.title || "Focus item"}`)
          .join("\n")}`;
      }
    } catch (err) {
      // Optional context
    }

    // Add strategy context (Strategy Engine v1)
    try {
      const { getCurrentStrategy } = await import("@/lib/strategy/api");
      const strategy = await getCurrentStrategy(userId);
      if (strategy && strategy.selectedPath) {
        systemPrompt += `\n\nUser's Current Strategy (${strategy.horizonDays}-day):\n`;
        systemPrompt += `Selected Path: ${strategy.selectedPath.name}\n`;
        systemPrompt += `Description: ${strategy.selectedPath.description}\n`;
        systemPrompt += `Key Pillars:\n${strategy.pillars
          .slice(0, 3)
          .map((p) => `- ${p.title}: ${p.description}`)
          .join("\n")}\n`;
        systemPrompt += `\nYou must respect the current chosen strategy unless strong reasons exist to suggest a revision. If you suggest deviating from the strategy, explain clearly why.`;
      }
    } catch (err) {
      // Optional
    }
  }

Provide a structured analysis in JSON format:
{
  "analysis": "Your narrative analysis of the situation from your coach's perspective",
  "key_concerns": ["concern 1", "concern 2", "..."],
  "recommended_steps": ["step 1", "step 2", "..."],
  "risks": ["risk 1", "risk 2", "..."]
}`;

  try {
    const response = await llmComplete(systemPrompt, {
      model: "gpt-4o-mini",
      temperature: 0.7,
      json: true,
      max_tokens: 800,
    });

    const parsed = typeof response === "string" ? JSON.parse(response) : response;

    return {
      coachId,
      personaId: persona.id,
      analysis: parsed.analysis || "",
      keyConcerns: Array.isArray(parsed.key_concerns) ? parsed.key_concerns : [],
      recommendedSteps: Array.isArray(parsed.recommended_steps) ? parsed.recommended_steps : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks : [],
    };
  } catch (err) {
    console.error(`[CouncilProtocol] Analysis failed for ${coachId}:`, err);
    // Return minimal analysis on error
    return {
      coachId,
      personaId: persona.id,
      analysis: `I'm analyzing this from a ${coachId} perspective.`,
      keyConcerns: [],
      recommendedSteps: [],
      risks: [],
    };
  }
}

/**
 * Run council synthesis
 */
export async function runCouncilSynthesis(
  params: CouncilSynthesisInput
): Promise<CouncilSynthesis> {
  const { mode, userInput, analyses, userModel } = params;

  const synthesisPrompt = `You are synthesizing input from multiple AI coaches in a Coach Council.

User's Question: ${userInput}

Council Mode: ${mode}

Individual Coach Analyses:
${analyses.map((a, idx) => `
Coach ${idx + 1} (${a.coachId}):
- Analysis: ${a.analysis}
- Key Concerns: ${a.keyConcerns.join(", ")}
- Recommended Steps: ${a.recommendedSteps.join(", ")}
- Risks: ${a.risks.join(", ")}
`).join("\n")}

User Context:
${userModel ? JSON.stringify(userModel, null, 2) : "No additional context"}

Your task:
1. Create a single, coherent answer that synthesizes all coach perspectives
2. Ensure the answer feels unified, not like multiple voices stitched together
3. Address the user's question directly
4. Include the most important insights from each coach

Output JSON:
{
  "final_answer": "The unified answer to show the user",
  "by_coach": [
    {
      "coach_id": "confidant",
      "short_role": "Emotional anchor",
      "focus": ["focus area 1", "focus area 2"],
      "key_contribution": "What this coach contributed"
    },
    ...
  ]
}`;

  try {
    const response = await llmComplete(synthesisPrompt, {
      model: "gpt-4o-mini",
      temperature: 0.7,
      json: true,
      max_tokens: 1200,
    });

    const parsed = typeof response === "string" ? JSON.parse(response) : response;

    return {
      final_answer: parsed.final_answer || "I've consulted with my team of coaches. Here's what we think...",
      by_coach: Array.isArray(parsed.by_coach) ? parsed.by_coach : [],
    };
  } catch (err) {
    console.error("[CouncilProtocol] Synthesis failed:", err);
    // Fallback synthesis
    return {
      final_answer: analyses.map((a) => a.analysis).join(" ").substring(0, 500),
      by_coach: analyses.map((a) => ({
        coach_id: a.coachId,
        short_role: a.coachId,
        focus: a.keyConcerns,
        key_contribution: a.analysis.substring(0, 100),
      })),
    };
  }
}

