// Coach Persona Engine v2 (Cortex-Driven)
// lib/coaching/cortex/persona-engine.ts

import "server-only";

import { CoachContext, CoachOutput, CoachPersona } from "./types";
import { getCoachPersona } from "./personas";
import { generateMicroPlan } from "@/lib/cortex/executive";
import { runAutonomy, AutonomyAction } from "@/lib/cortex/autonomy/v3";
import { logTrace } from "@/lib/cortex/trace/trace";
import { PulseObjective } from "@/lib/cortex/executive";
import { callAIJson } from "@/lib/ai/call";

/**
 * Generate coach response using Cortex + Persona
 */
export async function generateCoachResponse(
  userId: string,
  coachKey: string,
  userInput: string,
  coachCtx: CoachContext
): Promise<CoachOutput> {
  const persona = getCoachPersona(coachKey);
  if (!persona) {
    throw new Error(`Unknown coach persona: ${coachKey}`);
  }

  const traceEntries: CoachOutput["traceEntries"] = [];

  // Log persona selection
  await logTrace(
    userId,
    persona.traceSource as any,
    "info",
    `Persona ${persona.name} activated`,
    { coachKey, personaName: persona.name },
    { domain: "coaching" }
  );

  traceEntries.push({
    level: "info",
    message: `Persona ${persona.name} activated`,
    data: { coachKey, personaName: persona.name },
  });

  // Build persona-aware prompt
  const systemPrompt = buildPersonaPrompt(persona, coachCtx);
  const userPrompt = buildUserPrompt(userInput, coachCtx, persona);

  // Generate response using LLM
  const response = await callAIJson<{
    message: string;
    suggestedObjectives?: Array<{
      domain: string;
      title: string;
      description?: string;
      importance: number;
      urgency: number;
      estimatedMinutes?: number;
    }>;
    reasoning?: string;
  }>({
    userId,
    feature: "coach_cortex",
    systemPrompt,
    userPrompt,
    maxTokens: 1000,
    temperature: 0.7,
  });

  if (!response.success || !response.data) {
    throw new Error("Failed to generate coach response");
  }

  const { message, suggestedObjectives, reasoning } = response.data;

  // Log reasoning
  if (reasoning) {
    await logTrace(
      userId,
      persona.traceSource as any,
      "debug",
      `Coach reasoning: ${reasoning}`,
      { reasoning },
      { domain: "coaching" }
    );

    traceEntries.push({
      level: "debug",
      message: `Reasoning: ${reasoning}`,
      data: { reasoning },
    });
  }

  // Generate micro-plan if objectives suggested
  let microPlan;
  if (suggestedObjectives && suggestedObjectives.length > 0) {
    const objectives: PulseObjective[] = suggestedObjectives.map((obj) => ({
      id: `coach_obj_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      domain: obj.domain as any,
      title: obj.title,
      description: obj.description,
      importance: obj.importance,
      urgency: obj.urgency,
      estimatedMinutes: obj.estimatedMinutes,
    }));

    microPlan = generateMicroPlan(objectives, coachCtx.cortex);

    await logTrace(
      userId,
      persona.traceSource as any,
      "info",
      `Generated micro-plan with ${microPlan.microSteps.length} steps`,
      { objectiveCount: objectives.length, stepCount: microPlan.microSteps.length },
      { domain: "coaching" }
    );

    traceEntries.push({
      level: "info",
      message: `Generated micro-plan: ${microPlan.microSteps.length} steps`,
      data: { objectiveCount: objectives.length, stepCount: microPlan.microSteps.length },
    });
  }

  // Get autonomy actions relevant to persona's domains
  const autonomyActions = runAutonomy(coachCtx.cortex);
  const relevantActions = autonomyActions.filter((action) => {
    const personaDomain = persona.domainPriorities.find(
      (p) => p.domain === action.domain
    );
    return personaDomain && personaDomain.weight > 0.5;
  });

  // Log autonomy triggers
  if (relevantActions.length > 0) {
    await logTrace(
      userId,
      persona.traceSource as any,
      "info",
      `Found ${relevantActions.length} relevant autonomy actions`,
      { actionCount: relevantActions.length },
      { domain: "coaching" }
    );

    traceEntries.push({
      level: "info",
      message: `Autonomy actions: ${relevantActions.length} relevant`,
      data: { actionCount: relevantActions.length },
    });
  }

  return {
    message,
    suggestedActions: relevantActions.slice(0, 3), // Top 3
    microPlan,
    autonomyTriggers: relevantActions.map((a) => ({
      type: a.payload.type || "unknown",
      domain: a.domain,
      metadata: a.metadata || {},
    })),
    traceEntries,
    persona: {
      key: persona.key,
      name: persona.name,
      reasoning: reasoning || `Persona ${persona.name} responding based on Cortex context`,
    },
  };
}

/**
 * Build persona-aware system prompt
 */
function buildPersonaPrompt(persona: CoachPersona, ctx: CoachContext): string {
  const emotionContext = ctx.emotion
    ? `Current emotional state: ${ctx.emotion.detected_emotion} (intensity: ${ctx.emotion.intensity})`
    : "No recent emotion data";

  const xpContext = `XP today: ${ctx.xp.today}, Streak: ${ctx.xp.streakDays} days`;

  const patternContext = ctx.longitudinal.aggregatedPatterns.length > 0
    ? `Detected patterns: ${ctx.longitudinal.aggregatedPatterns
        .slice(0, 3)
        .map((p) => p.type)
        .join(", ")}`
    : "No significant patterns detected";

  const domainContext = Object.entries(ctx.domains)
    .filter(([_, data]) => data !== undefined)
    .map(([domain, data]) => {
      if (domain === "work" && (data as any).queue) {
        return `Work: ${(data as any).queue.length} items in queue`;
      }
      if (domain === "relationships" && (data as any).keyPeople) {
        return `Relationships: ${(data as any).keyPeople.length} key people`;
      }
      return `${domain}: active`;
    })
    .join(", ");

  return `You are ${persona.name}, a ${persona.description}.

Your style:
- Tone: ${persona.styleProfile.tone}
- Pacing: ${persona.styleProfile.pacing}
- Authority: ${persona.styleProfile.authority}
- Formality: ${persona.styleProfile.formality}

Emotional heuristics:
- When user is stressed: ${persona.emotionalHeuristics.whenStressed}
- When user has low energy: ${persona.emotionalHeuristics.whenLowEnergy}
- When user has high momentum: ${persona.emotionalHeuristics.whenHighMomentum}

Current context:
${emotionContext}
${xpContext}
${patternContext}
${domainContext}

Signature behaviors:
${persona.signatureBehaviors.map((b) => `- ${b}`).join("\n")}

You have access to the user's complete life context through Pulse Cortex. Use this to provide deeply personalized, context-aware guidance.

Be authentic to your persona while leveraging Cortex insights.`;
}

/**
 * Build user prompt with context
 */
function buildUserPrompt(
  userInput: string,
  ctx: CoachContext,
  persona: CoachPersona
): string {
  // Add relevant context based on persona's domain priorities
  const contextParts: string[] = [userInput];

  // Add domain-specific context
  for (const priority of persona.domainPriorities) {
    if (priority.weight > 0.5) {
      const domainData = ctx.domains[priority.domain];
      if (domainData) {
        if (priority.domain === "work" && (domainData as any).queue) {
          const queue = (domainData as any).queue;
          contextParts.push(
            `\nWork context: ${queue.length} items in queue. Top priorities: ${queue
              .slice(0, 3)
              .map((item: any) => item.title)
              .join(", ")}`
          );
        }
        if (priority.domain === "relationships" && (domainData as any).keyPeople) {
          const people = (domainData as any).keyPeople;
          contextParts.push(
            `\nRelationships context: ${people.length} key relationships. Recent interactions: ${people
              .slice(0, 3)
              .map((p: any) => `${p.name} (${p.daysSinceInteraction} days ago)`)
              .join(", ")}`
          );
        }
      }
    }
  }

  // Add pattern context if relevant
  const relevantPatterns = ctx.longitudinal.aggregatedPatterns.filter((p) => {
    if (persona.key === "motivational" && p.type === "productivity_arc") return true;
    if (persona.key === "confidant" && p.type === "burnout_cycle") return true;
    if (persona.key === "productivity" && p.type === "procrastination_cycle") return true;
    return false;
  });

  if (relevantPatterns.length > 0) {
    contextParts.push(
      `\nRelevant patterns: ${relevantPatterns.map((p) => p.description).join("; ")}`
    );
  }

  return contextParts.join("\n");
}

