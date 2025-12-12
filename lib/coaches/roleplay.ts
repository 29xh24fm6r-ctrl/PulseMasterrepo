// Roleplay Engine v2.5 (Sales Coach)
// lib/coaches/roleplay.ts

import { RoleplayScenario, RoleplayMessage, CoachContextPack, CoachScenario, CoachFeedbackV2 } from "./types";
import { llmJson, llmComplete } from "@/lib/llm/client";

// 4.1 Default vehicle price objection scenario
export function getDefaultVehiclePriceScenario(): RoleplayScenario {
  return {
    context: "auto_sales",
    customerProfile: {
      name: "Jordan",
      budget: 35000,
      hardLimit: 36500,
      creditScore: 690,
      priorities: ["monthly payment", "reliable for 5+ years"],
    },
    vehicle: {
      model: "2024 Toyota Highlander XLE",
      dealerCost: 40000,
      listPrice: 44000,
      promoOptions: [
        "0.9% APR for 36 months",
        "$1,000 rebate OR 0.9% APR",
      ],
    },
    objective: "Practice handling a realistic vehicle price objection with a rational but firm customer.",
    constraints: {
      customerMustBeRational: true,
      acknowledgeValidMath: true,
      canWalkAwayIfPushedTooHard: true,
      shouldMoveTowardResolutionIfValueIsShown: true,
      difficulty: "normal",
    },
  };
}

// 4.2 System prompts

// v2.5: Updated to accept CoachScenario
export function buildCustomerSystemPrompt(
  scenario: RoleplayScenario | CoachScenario,
  difficulty?: string
): string {
  // Handle both old RoleplayScenario and new CoachScenario
  let customerProfile: any;
  let constraints: any;
  let vehicle: any;

  if ("customerProfile" in scenario) {
    // Old RoleplayScenario format
    customerProfile = scenario.customerProfile;
    constraints = scenario.constraints;
    vehicle = scenario.vehicle;
  } else {
    // New CoachScenario format
    customerProfile = scenario.customerProfile || {};
    constraints = scenario.constraints || {};
    vehicle = customerProfile.vehicle;
  }

  const difficultyLevel = difficulty || (constraints?.difficulty || "normal");
  const isAdvanced = difficultyLevel === "advanced" || difficultyLevel === "expert";

  const baseRules = [
    "You are the CUSTOMER in a sales roleplay.",
    "",
    customerProfile.name ? `Your name is ${customerProfile.name}.` : "",
    customerProfile.budget
      ? `Your budget is $${customerProfile.budget.toLocaleString()}${customerProfile.hardLimit ? ` with a hard limit of $${customerProfile.hardLimit.toLocaleString()}.` : "."}`
      : "",
    vehicle?.model ? `You are shopping for a ${vehicle.model}.` : "",
    vehicle?.listPrice
      ? `The list price is $${vehicle.listPrice.toLocaleString()}.`
      : "",
    "",
    "RULES:",
    "- You must be rational and realistic.",
    "- When the salesperson shows clear math that proves your initial price cannot work without an unreasonable loss, you acknowledge the point.",
    "- You can still be firm, skeptical, and push for discounts, but you do not ignore basic arithmetic or behave irrationally.",
    "- Your goal is to get the best overall deal, not to 'win at all costs'.",
    "- Speak like a normal customer: short, natural sentences; no narration; one answer per turn.",
  ];

  if (isAdvanced) {
    baseRules.push(
      "- You are a sophisticated buyer. You may use negotiation tactics, reference market research, or compare with competitors.",
      "- You can walk away if the deal doesn't make sense, but you'll give clear reasons."
    );
  } else {
    baseRules.push(
      "- You are a typical buyer. Keep your responses straightforward and realistic.",
      "- You can walk away if pushed too hard, but only when it's reasonable given the scenario."
    );
  }

  baseRules.push("", "The user plays the salesperson. Only reply with what you (the customer) would say next.");

  return baseRules.filter(Boolean).join("\n");
}

// v2.5: Updated to use CoachScenario and preferences
export function buildCoachSystemPrompt(
  coachContext: CoachContextPack,
  scenario: RoleplayScenario | CoachScenario
): string {
  const lastSession = coachContext.learningHistory.lastSessions[0];
  const tone = coachContext.preferences?.tone || "supportive";
  const difficulty = coachContext.difficultyLevel || "beginner";

  // Tone-specific instructions
  const toneInstructions: Record<string, string> = {
    supportive: "Be encouraging and patient. Focus on building confidence. Use phrases like 'Great job!' and 'You're on the right track.'",
    direct: "Be straightforward and actionable. Give clear, no-nonsense feedback. Skip fluff, focus on what works.",
    drill_sergeant: "Be intense and demanding. Push for excellence. Use strong language and high standards. Challenge them to do better.",
    calm: "Be measured and thoughtful. Speak slowly and clearly. Focus on mindfulness and deliberate practice.",
  };

  const scenarioTitle = "title" in scenario ? scenario.title : "Vehicle Price Objection";
  const scenarioDesc = "description" in scenario ? scenario.description : scenario.objective || "";

  return [
    "You are the SALES COACH in Pulse OS, not the customer.",
    "",
    "Your responsibilities:",
    "1. Run a realistic roleplay where the user plays the salesperson and an AI customer plays the buyer.",
    "2. Every 3–4 turns, pause the roleplay and provide brief coaching feedback:",
    "   - What the user did well",
    "   - What could be improved",
    "   - One concrete suggestion for the next line",
    "3. Build on prior training instead of restarting from scratch.",
    "",
    `SCENARIO: ${scenarioTitle}`,
    scenarioDesc ? `Description: ${scenarioDesc}` : "",
    `Difficulty Level: ${difficulty}`,
    "",
    `User profile: ${coachContext.userProfile.name ?? "Unknown"} – role: ${coachContext.userProfile.role ?? "unknown"}, company: ${coachContext.userProfile.company ?? "unknown"}.`,
    coachContext.learningHistory.completedLessons.length
      ? `They have completed lessons: ${coachContext.learningHistory.completedLessons
          .slice(0, 3)
          .map(l => `"${l.title}"`)
          .join(", ")}.`
      : "No prior recorded lessons.",
    lastSession
      ? `Last session (${lastSession.scenarioType}) focused on skills ${lastSession.skillNodes.join(", ")} with rating ${lastSession.successRating ?? "n/a"}.`
      : "",
    coachContext.recentPerformanceSummary
      ? `Recent performance: Average score ${coachContext.recentPerformanceSummary.averageScore}/100 over ${coachContext.recentPerformanceSummary.sessionsCount} sessions.`
      : "",
    coachContext.thirdBrainInsights.keyTrends.length
      ? `Third Brain trends: ${coachContext.thirdBrainInsights.keyTrends.join(" | ")}.`
      : "",
    "",
    "COACHING TONE:",
    toneInstructions[tone] || toneInstructions.supportive,
    "",
    "Instruction style:",
    "- Keep coaching concise and practical.",
    "- Use the frameworks the user already learned (e.g. 3-step objection handling: Acknowledge → Clarify → Reframe).",
    "- When pausing, clearly mark FEEDBACK vs ROLEPLAY.",
    "- Reference past themes: " + (coachContext.learningHistory.lastSessions.length > 0
      ? `"You've been working on ${lastSession.skillNodes.join(", ")} recently..."`
      : "This is a new area for you."),
  ]
    .filter(Boolean)
    .join("\n");
}

// 4.3 Realism Guard

// v2.5: Updated to handle both scenario types
export async function realismGuardCheck(
  scenario: RoleplayScenario | CoachScenario,
  customerReply: string
): Promise<{ score: number; explanation: string }> {
  let budget: number | undefined;
  let hardLimit: number | undefined;
  let vehicleInfo: string = "";

  if ("customerProfile" in scenario) {
    budget = scenario.customerProfile.budget;
    hardLimit = scenario.customerProfile.hardLimit;
    if (scenario.vehicle) {
      vehicleInfo = `Vehicle dealer cost: $${scenario.vehicle.dealerCost}, list price: $${scenario.vehicle.listPrice}.`;
    }
  } else {
    const cp = scenario.customerProfile || {};
    budget = cp.budget;
    hardLimit = cp.hardLimit;
    if (cp.vehicle) {
      vehicleInfo = `Vehicle list price: $${cp.vehicle.listPrice || cp.vehicle.dealerCost}.`;
    }
  }

  const prompt = [
    "You are evaluating a customer's reply in a sales scenario.",
    "Rate how realistic and rational the reply is on a scale of 1–10, given:",
    budget ? `- Budget: $${budget.toLocaleString()}${hardLimit ? `, hard limit: $${hardLimit.toLocaleString()}` : ""}.` : "",
    vehicleInfo ? `- ${vehicleInfo}` : "",
    "",
    "Customer reply:",
    customerReply,
    "",
    "The customer should:",
    "- Behave rationally and acknowledge valid math when shown",
    "- Only walk away when it's reasonable given the constraints",
    "- Not ignore basic arithmetic or be completely irrational",
    "",
    "Return JSON only with fields {\"score\": number, \"explanation\": string}.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const json = await llmJson({
      prompt,
      model: "gpt-4o-mini",
    });

    return {
      score: json.score ?? 7,
      explanation: json.explanation ?? "",
    };
  } catch (error) {
    console.error("[RealismGuard] Error:", error);
    // Default to neutral score if LLM fails
    return {
      score: 7,
      explanation: "Could not evaluate realism",
    };
  }
}

// v2.5: Generate structured feedback v2
export async function generateCoachFeedbackV2(args: {
  transcript: RoleplayMessage[];
  scenario: RoleplayScenario | CoachScenario;
  context: CoachContextPack;
}): Promise<CoachFeedbackV2> {
  const { transcript, scenario, context } = args;

  const scenarioTitle = "title" in scenario ? scenario.title : "Roleplay Scenario";
  const difficulty = context.difficultyLevel || "beginner";

  const transcriptText = transcript
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  const contextSummary = [
    context.userProfile.name ? `User: ${context.userProfile.name}` : "",
    context.recentPerformanceSummary
      ? `Recent average score: ${context.recentPerformanceSummary.averageScore}/100`
      : "",
    context.learningHistory.lastSessions.length > 0
      ? `Last session skills: ${context.learningHistory.lastSessions[0].skillNodes.join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = [
    "You are analyzing a sales roleplay session to provide structured feedback.",
    "",
    `SCENARIO: ${scenarioTitle}`,
    `Difficulty: ${difficulty}`,
    contextSummary ? `\nContext:\n${contextSummary}` : "",
    "",
    "TRANSCRIPT:",
    transcriptText,
    "",
    "Analyze the user's performance (the salesperson) and provide structured feedback in JSON format:",
    "{",
    '  "whatWentWell": ["strength 1", "strength 2", ...], // 2-4 specific things they did well',
    '  "whatToImprove": ["area 1", "area 2", ...], // 2-4 specific areas to improve',
    '  "suggestedDrills": ["drill 1", "drill 2", ...], // 2-3 concrete practice exercises',
    '  "confidenceScore": 75 // 0-100 overall performance score',
    "}",
    "",
    "Be specific and actionable. Focus on observable behaviors, not vague advice.",
  ].join("\n");

  try {
    const json = await llmJson({
      prompt,
      model: "gpt-4o-mini",
    });

    return {
      whatWentWell: Array.isArray(json.whatWentWell) ? json.whatWentWell : [],
      whatToImprove: Array.isArray(json.whatToImprove) ? json.whatToImprove : [],
      suggestedDrills: Array.isArray(json.suggestedDrills) ? json.suggestedDrills : [],
      confidenceScore: typeof json.confidenceScore === "number" ? Math.max(0, Math.min(100, json.confidenceScore)) : 50,
    };
  } catch (error) {
    console.error("[CoachFeedbackV2] Error:", error);
    // Return default feedback on error
    return {
      whatWentWell: ["Engaged in the roleplay"],
      whatToImprove: ["Continue practicing"],
      suggestedDrills: ["Review the scenario and try again"],
      confidenceScore: 50,
    };
  }
}

