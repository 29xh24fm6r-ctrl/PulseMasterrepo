// Quantum Task Interpreter - Semantic Task Intelligence
// lib/quantum-tasks/interpreter.ts

import { callAIJson } from "@/lib/ai/call";
import { getWorkCortexContextForUser } from "@/lib/cortex/context";
import { TaskInterpretation, MicroStep } from "./types";
import { v4 as uuidv4 } from "uuid";

/**
 * Interpret raw task input into quantum task ontology
 */
export async function interpretTask(
  userId: string,
  rawInput: string,
  context?: any
): Promise<TaskInterpretation> {
  // Build Cortex context if not provided
  const ctx = context || await getWorkCortexContextForUser(userId);

  // Use AI to interpret the task
  const systemPrompt = `You are a quantum task interpreter. Analyze the user's task input and extract:
- Domain (work, relationships, finance, life, strategy)
- Task type (communication, creation, analysis, maintenance, planning, etc.)
- Intent (what the user really wants to achieve)
- Identity mode needed (which archetype mode is best: warrior, strategist, creator, builder, stoic, leader, sage)
- Energy requirement (0-1, how much energy needed)
- Time requirement in minutes
- Cognitive difficulty (0-1, how mentally demanding)
- Emotional resistance (0-1, how much user might resist doing this)
- Relationship relevance (extract person names/IDs if mentioned)
- Strategic importance (0-1, how important for long-term goals)
- Micro-steps (break into 3-7 small actionable steps)

Current user context:
- Emotion: ${ctx.emotion?.detected_emotion || "neutral"}
- Energy: ${ctx.cognitiveProfile?.currentEnergyLevel || 0.5}
- Identity: ${ctx.longitudinal?.chapters?.[ctx.longitudinal.chapters.length - 1]?.title || "Current chapter"}

Respond in JSON format.`;

  const userPrompt = `Task: "${rawInput}"`;

  const response = await callAIJson<{
    domain: string;
    taskType: string;
    intent?: string;
    identityModeNeeded?: string;
    energyRequirement: number;
    timeRequirementMinutes?: number;
    cognitiveDifficulty: number;
    emotionalResistance: number;
    relationshipRelevance: string[];
    strategicImportance: number;
    microSteps: Array<{
      title: string;
      description?: string;
      estimatedMinutes: number;
    }>;
  }>({
    userId,
    feature: "quantum_task_interpreter",
    systemPrompt,
    userPrompt,
    maxTokens: 1500,
    temperature: 0.7,
  });

  if (!response.success || !response.data) {
    // Fallback to heuristic interpretation
    return heuristicInterpretation(rawInput, ctx);
  }

  const data = response.data;

  // Convert micro-steps
  const microSteps: MicroStep[] = data.microSteps.map((step, i) => ({
    id: uuidv4(),
    title: step.title,
    description: step.description,
    estimatedMinutes: step.estimatedMinutes || 5,
    order: i + 1,
    completed: false,
  }));

  return {
    domain: data.domain as TaskInterpretation["domain"],
    taskType: data.taskType,
    intent: data.intent,
    identityModeNeeded: data.identityModeNeeded,
    energyRequirement: Math.max(0, Math.min(1, data.energyRequirement)),
    timeRequirementMinutes: data.timeRequirementMinutes,
    cognitiveDifficulty: Math.max(0, Math.min(1, data.cognitiveDifficulty)),
    emotionalResistance: Math.max(0, Math.min(1, data.emotionalResistance)),
    relationshipRelevance: data.relationshipRelevance || [],
    strategicImportance: Math.max(0, Math.min(1, data.strategicImportance)),
    microSteps,
  };
}

/**
 * Heuristic fallback interpretation
 */
function heuristicInterpretation(rawInput: string, ctx: any): TaskInterpretation {
  const input = rawInput.toLowerCase();

  // Determine domain
  let domain: TaskInterpretation["domain"] = "work";
  if (input.includes("email") || input.includes("message") || input.includes("call")) {
    domain = "relationships";
  } else if (input.includes("pay") || input.includes("money") || input.includes("budget")) {
    domain = "finance";
  } else if (input.includes("exercise") || input.includes("habit") || input.includes("health")) {
    domain = "life";
  } else if (input.includes("plan") || input.includes("strategy") || input.includes("goal")) {
    domain = "strategy";
  }

  // Determine task type
  let taskType = "maintenance";
  if (input.includes("email") || input.includes("message")) {
    taskType = "communication";
  } else if (input.includes("create") || input.includes("write") || input.includes("build")) {
    taskType = "creation";
  } else if (input.includes("review") || input.includes("analyze") || input.includes("read")) {
    taskType = "analysis";
  } else if (input.includes("plan") || input.includes("organize")) {
    taskType = "planning";
  }

  // Extract person names (simple heuristic)
  const relationshipRelevance: string[] = [];
  const words = input.split(/\s+/);
  for (const word of words) {
    if (word[0] && word[0] === word[0].toUpperCase() && word.length > 2) {
      // Potential name
      relationshipRelevance.push(word);
    }
  }

  // Generate micro-steps
  const microSteps: MicroStep[] = [
    {
      id: uuidv4(),
      title: `Prepare for: ${rawInput}`,
      estimatedMinutes: 5,
      order: 1,
      completed: false,
    },
    {
      id: uuidv4(),
      title: rawInput,
      estimatedMinutes: 15,
      order: 2,
      completed: false,
    },
    {
      id: uuidv4(),
      title: `Complete: ${rawInput}`,
      estimatedMinutes: 5,
      order: 3,
      completed: false,
    },
  ];

  return {
    domain,
    taskType,
    energyRequirement: 0.5,
    timeRequirementMinutes: 25,
    cognitiveDifficulty: 0.5,
    emotionalResistance: 0.3,
    relationshipRelevance,
    strategicImportance: 0.5,
    microSteps,
  };
}



