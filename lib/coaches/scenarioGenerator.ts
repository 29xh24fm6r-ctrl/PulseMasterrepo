// AI Auto-Generated Scenarios V2
// lib/coaches/scenarioGenerator.ts

import { CoachScenario, CoachContextPack, CoachDifficulty } from "../types";
import { llmJson } from "@/lib/llm/client";

export interface ScenarioGenerationInput {
  prompt: string;
  userProfile: CoachContextPack["userProfile"];
  thirdBrainInsights: CoachContextPack["thirdBrainInsights"];
  preferredDifficulty?: CoachDifficulty;
}

export interface GeneratedScenario extends CoachScenario {
  qualityScore: number;
  curveballs?: string[];
}

/**
 * Generate a coaching scenario from a natural language prompt
 */
export async function generateScenarioFromPrompt(
  input: ScenarioGenerationInput
): Promise<GeneratedScenario> {
  const { prompt, userProfile, thirdBrainInsights, preferredDifficulty } = input;

  const contextInfo = [
    userProfile.name ? `User: ${userProfile.name}` : "",
    userProfile.role ? `Role: ${userProfile.role}` : "",
    userProfile.company ? `Company: ${userProfile.company}` : "",
    thirdBrainInsights.keyTrends.length > 0
      ? `Recent patterns: ${thirdBrainInsights.keyTrends.slice(0, 3).join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const systemPrompt = [
    "You are an expert at creating realistic coaching scenarios for sales, negotiation, and professional development.",
    "",
    "Generate a complete, detailed scenario based on the user's description.",
    "",
    "The scenario must include:",
    "1. Customer persona (name, background, motivations, constraints)",
    "2. Clear goals and objectives",
    "3. Conflict/tension points",
    "4. Realistic constraints (budget, timeline, must-haves)",
    "5. Emotional tone",
    "6. Likely objections",
    "7. Success criteria",
    "8. Optional curveballs (unexpected challenges)",
    "",
    "Make it realistic, challenging but fair, and aligned with the user's experience level.",
  ].join("\n");

  const userPrompt = [
    "User's scenario description:",
    prompt,
    "",
    contextInfo ? `User context:\n${contextInfo}` : "",
    preferredDifficulty ? `Preferred difficulty: ${preferredDifficulty}` : "",
    "",
    "Generate a complete scenario in JSON format:",
    "{",
    '  "coachType": "sales" | "negotiation" | "other",',
    '  "title": "Scenario title",',
    '  "description": "Brief description",',
    '  "difficulty": "beginner" | "intermediate" | "advanced" | "expert",',
    '  "topicTags": ["tag1", "tag2"],',
    '  "customerProfile": {',
    '    "name": "Customer name",',
    '    "background": "Background info",',
    '    "budget": 0,',
    '    "hardLimit": 0,',
    '    "priorities": ["priority1", "priority2"],',
    '    "motivations": ["motivation1"],',
    '    "constraints": ["constraint1"]',
    "  },",
    '  "constraints": {',
    '    "budget": 0,',
    '    "timeline": "description",',
    '    "mustHaves": ["item1"],',
    '    "dealBreakers": ["item1"]',
    "  },",
    '  "objectives": "What the user should practice",',
    '  "likelyObjections": ["objection1", "objection2"],',
    '  "successCriteria": ["criteria1", "criteria2"],',
    '  "curveballs": ["curveball1"],',
    '  "emotionalTone": "description",',
    '  "initialPrompt": "Setup text for the user"',
    "}",
  ].join("\n");

  try {
    const result = await llmJson({
      prompt: userPrompt,
      systemPrompt,
      model: "gpt-4o-mini",
    });

    // Validate and structure the result
    const scenario: GeneratedScenario = {
      id: "", // Will be set when saved
      coachType: result.coachType || "sales",
      title: result.title || "Generated Scenario",
      description: result.description || "",
      difficulty: (result.difficulty as CoachDifficulty) || "intermediate",
      topicTags: Array.isArray(result.topicTags) ? result.topicTags : [],
      customerProfile: result.customerProfile || {},
      constraints: result.constraints || {},
      initialPrompt: result.initialPrompt || prompt,
      qualityScore: await assessScenarioQuality(result),
      curveballs: Array.isArray(result.curveballs) ? result.curveballs : [],
    };

    return scenario;
  } catch (error) {
    console.error("[ScenarioGenerator] Error:", error);
    // Return a basic fallback scenario
    return {
      id: "",
      coachType: "sales",
      title: "Generated Scenario",
      description: prompt,
      difficulty: preferredDifficulty || "intermediate",
      topicTags: [],
      customerProfile: {},
      constraints: {},
      initialPrompt: prompt,
      qualityScore: 50,
    };
  }
}

/**
 * Assess the quality of a generated scenario
 */
async function assessScenarioQuality(scenario: any): Promise<number> {
  const prompt = [
    "Rate the quality of this coaching scenario on a scale of 0-100:",
    "",
    JSON.stringify(scenario, null, 2),
    "",
    "Consider:",
    "- Realism and believability",
    "- Clarity of objectives",
    "- Appropriate difficulty",
    "- Completeness of details",
    "",
    "Return JSON:",
    '{"score": 0-100, "reasoning": "brief explanation"}',
  ].join("\n");

  try {
    const result = await llmJson({ prompt, model: "gpt-4o-mini" });
    return result.score || 75;
  } catch (error) {
    return 75; // Default quality score
  }
}

