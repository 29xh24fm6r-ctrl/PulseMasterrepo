// AGI Intent Classification
// lib/universe/intent.ts

export type AGIIntentType =
  | "navigate_realm"
  | "summarize_state"
  | "suggest_focus"
  | "calm_me_down"
  | "growth_push"
  | "unknown";

export interface IntentResult {
  type: AGIIntentType;
  confidence: number;
  targetRealm?: string;
  message?: string;
}

export function classifyIntent(text: string): IntentResult {
  const t = text.toLowerCase().trim();

  // Navigate to realm
  const realmKeywords: Record<string, string[]> = {
    work: ["work", "deals", "sales", "business", "job", "career"],
    productivity: ["productivity", "tasks", "focus", "get things done", "todo"],
    life: ["life", "overall", "everything", "dashboard"],
    growth: ["growth", "level up", "improve", "next level", "ascension"],
    wellness: ["wellness", "health", "stress", "energy", "vitality"],
    relationships: ["relationships", "people", "contacts", "friends", "network"],
    finance: ["finance", "money", "budget", "spending", "financial"],
    simulation: ["simulation", "simulate", "what if", "future"],
    twin: ["twin", "ai twin", "digital self"],
    autopilot: ["autopilot", "automate", "suggestions"],
  };

  for (const [realm, keywords] of Object.entries(realmKeywords)) {
    if (keywords.some((keyword) => t.includes(keyword))) {
      return {
        type: "navigate_realm",
        confidence: 0.9,
        targetRealm: realm,
        message: `Opening ${realm}...`,
      };
    }
  }

  // Suggest focus
  if (
    (t.includes("today") || t.includes("now") || t.includes("focus")) &&
    (t.includes("what") || t.includes("should") || t.includes("start") || t.includes("matter"))
  ) {
    return {
      type: "suggest_focus",
      confidence: 0.85,
      message: "Let me show you what matters most today.",
    };
  }

  // Calm down
  if (
    t.includes("overwhelmed") ||
    t.includes("anxious") ||
    t.includes("stressed") ||
    t.includes("calm") ||
    t.includes("help me relax")
  ) {
    return {
      type: "calm_me_down",
      confidence: 0.9,
      message: "Let's find some calm. I'll guide you.",
    };
  }

  // Growth push
  if (
    t.includes("grow") ||
    t.includes("improve") ||
    t.includes("next level") ||
    t.includes("better") ||
    t.includes("progress")
  ) {
    return {
      type: "growth_push",
      confidence: 0.8,
      message: "Let's focus on growth. Here's where to start.",
    };
  }

  // Summarize state
  if (
    t.includes("summary") ||
    t.includes("how am i") ||
    t.includes("how are things") ||
    t.includes("status") ||
    t.includes("overview")
  ) {
    return {
      type: "summarize_state",
      confidence: 0.85,
      message: "Here's your current state across all systems.",
    };
  }

  // Unknown
  return {
    type: "unknown",
    confidence: 0.3,
    message: "I'm not sure what you mean. Try asking about a specific realm or what to focus on.",
  };
}



