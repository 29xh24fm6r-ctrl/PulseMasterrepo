// Strategy Path Generation & Scoring
// lib/strategy/options.ts

import { llmComplete } from "@/lib/llm/client";
import { StrategyModel } from "./model";

export type StrategyPathKey =
  | "healing_focus"
  | "career_sprint"
  | "balanced_ascent"
  | "rebuild_foundation"
  | "relationship_restore"
  | "custom";

export interface StrategyPathCandidate {
  key: string;
  name: string;
  description: string;
  pros: string;
  cons: string;
  riskLevel: number;         // 1–5
  opportunityLevel: number;  // 1–5
  score: number;             // 0–1
}

/**
 * Generate strategy path options
 */
export async function generateStrategyPathOptions(
  model: StrategyModel
): Promise<StrategyPathCandidate[]> {
  // Determine which paths are viable based on model
  const keys: string[] = [];

  const burnoutHigh = model.risks.burnout >= 60;
  const careerArc = model.lifeArcs.find((a) => a.key === "career_level_up" || a.key === "career_transition");
  const healingArc = model.lifeArcs.find((a) => a.key === "healing" || a.key === "emotional_stability");

  if (burnoutHigh) {
    keys.push("healing_focus", "rebuild_foundation", "balanced_ascent");
  } else if (careerArc) {
    keys.push("career_sprint", "balanced_ascent", "healing_focus");
  } else {
    keys.push("balanced_ascent", "rebuild_foundation");
  }

  if (model.lifeArcs.some((a) => a.key === "relationship_restore")) {
    keys.push("relationship_restore");
  }

  // Deduplicate
  const uniqueKeys = Array.from(new Set(keys));

  // Generate paths using LLM
  const drafted = await draftPathsWithLLM(model, uniqueKeys);
  
  // Compute scores
  const paths = drafted.map((p) => ({
    ...p,
    score: computePathScore(model, p),
  }));

  // Sort by score
  paths.sort((a, b) => b.score - a.score);

  return paths;
}

/**
 * Draft paths with LLM
 */
async function draftPathsWithLLM(
  model: StrategyModel,
  keys: string[]
): Promise<Array<Omit<StrategyPathCandidate, "score">>> {
  const paths: Array<Omit<StrategyPathCandidate, "score">> = [];

  for (const pathKey of keys) {
    const path = await generatePathCandidate(model, pathKey);
    if (path) {
      paths.push(path);
    }
  }

  return paths;
}

/**
 * Generate a single path candidate
 */
async function generatePathCandidate(
  model: StrategyModel,
  pathKey: string
): Promise<StrategyPathCandidate | null> {
  const pathDefinitions: Record<string, { name: string; baseDescription: string }> = {
    healing_focus: {
      name: "Healing Focus",
      baseDescription: "Prioritize stress reduction and emotional stability",
    },
    career_sprint: {
      name: "Career Sprint",
      baseDescription: "Push Career Level-Up arc harder with focused intensity",
    },
    balanced_ascent: {
      name: "Balanced Ascent",
      baseDescription: "Maintain healing while growing career steadily",
    },
    rebuild_foundation: {
      name: "Rebuild Foundation",
      baseDescription: "Focus on habits, sleep, and routines as the foundation",
    },
    relationship_restore: {
      name: "Relationship Restore",
      baseDescription: "Focus on repairing and strengthening key relationships",
    },
  };

  const pathDef = pathDefinitions[pathKey];
  if (!pathDef) return null;

  const prompt = `You are building a strategy option for the user's next ${model.horizonDays} days.

Path: ${pathDef.name}
Base Description: ${pathDef.baseDescription}

User's Current State:
- Burnout Risk: ${model.risks.burnout}%
- Career Upside: ${model.opportunities.careerUpside}%
- Healing Potential: ${model.opportunities.healingPotential}%
- Top Life Arc: ${model.currentFocus.topArcKey || "none"}
- Current Stress: ${model.twin.stress}
- Current Energy: ${model.twin.energy}

Generate a strategy path description with honest pros and cons. Use probabilistic language ("may", "could", "tends to"). Avoid guarantees.

Output JSON:
{
  "description": "2-3 sentence description of this path",
  "pros": "2-3 key benefits (bullet points)",
  "cons": "2-3 key drawbacks or risks (bullet points)",
  "riskLevel": 1-5,
  "opportunityLevel": 1-5
}`;

  try {
    const response = await llmComplete(prompt, {
      model: "gpt-4o-mini",
      temperature: 0.7,
      json: true,
      max_tokens: 300,
    });

    const parsed = typeof response === "string" ? JSON.parse(response) : response;

    return {
      key: pathKey,
      name: pathDef.name,
      description: parsed.description || pathDef.baseDescription,
      pros: parsed.pros || "Potential benefits",
      cons: parsed.cons || "Potential risks",
      riskLevel: Math.max(1, Math.min(5, parsed.riskLevel || 3)),
      opportunityLevel: Math.max(1, Math.min(5, parsed.opportunityLevel || 3)),
      score: 0, // Will be calculated
    };
  } catch (err) {
    console.error(`[StrategyOptions] Failed to generate path ${pathKey}:`, err);
    // Return default
    return {
      key: pathKey,
      name: pathDef.name,
      description: pathDef.baseDescription,
      pros: "Potential benefits",
      cons: "Potential risks",
      riskLevel: 3,
      opportunityLevel: 3,
      score: 0,
    };
  }
}

/**
 * Compute path score
 */
function computePathScore(path: StrategyPathCandidate, model: StrategyModel): number {
  let score = 0;

  // Opportunity component (40%)
  const opportunityScore = path.opportunityLevel / 5;
  score += 0.4 * opportunityScore;

  // Risk component (30%) - lower risk is better
  const riskScore = (6 - path.riskLevel) / 5;
  score += 0.3 * riskScore;

  // Alignment with top arc (30%)
  let alignmentScore = 0.5; // Default neutral
  if (model.currentFocus.topArcKey) {
    if (
      (path.key === "healing_focus" && model.currentFocus.topArcKey.includes("healing")) ||
      (path.key === "career_sprint" && model.currentFocus.topArcKey.includes("career")) ||
      (path.key === "balanced_ascent" && model.currentFocus.topArcKey)
    ) {
      alignmentScore = 0.8;
    }
  }
  score += 0.3 * alignmentScore;

  // Adjust for burnout risk
  if (model.risks.burnout > 60 && path.key === "career_sprint") {
    score -= 0.2; // Penalize career sprint if burnout high
  }

  if (model.risks.burnout > 60 && path.key === "healing_focus") {
    score += 0.1; // Boost healing if burnout high
  }

  return Math.max(0, Math.min(1, score));
}

