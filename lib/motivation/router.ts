// Pulse Motivational Coach - Adaptive Motivation Router
// Selects optimal personas based on user state and history

import {
  UserMotivationalState,
  RoutingDecision,
  PulsePersona,
  MotivationalNeed,
  PersonaEffectivenessMap,
} from "./types";
import { PERSONAS } from "./persona-library";

// Filter personas that match the user's needs
function personasForNeeds(needs: MotivationalNeed[]): PulsePersona[] {
  return PERSONAS.filter(
    (p) =>
      p.primaryNeeds.some((n) => needs.includes(n)) ||
      p.secondaryNeeds.some((n) => needs.includes(n))
  );
}

// Filter out high-intensity personas if user prefers gentle
function filterByGentleness(
  candidates: PulsePersona[],
  prefersGentle: boolean
): PulsePersona[] {
  if (!prefersGentle) return candidates;
  return candidates.filter(
    (p) => p.defaultIntensity !== "high" || p.archetype === "spiritual"
  );
}

// Score a persona based on needs match, history, and identity alignment
function scorePersona(
  persona: PulsePersona,
  state: UserMotivationalState,
  history: PersonaEffectivenessMap
): number {
  // Base score from needs matching
  const primaryMatch = persona.primaryNeeds.filter((n) =>
    state.needs.includes(n)
  ).length;
  const secondaryMatch = persona.secondaryNeeds.filter((n) =>
    state.needs.includes(n)
  ).length;
  const baseScore = primaryMatch * 3 + secondaryMatch;

  // Historical effectiveness bonus
  const historyBonus = history[persona.id] ?? 0;

  // Identity path alignment bonus
  let identityBonus = 0;
  const pathLower = state.identityPath.toLowerCase();

  if (pathLower.includes("stoic") && persona.archetype === "philosophy") {
    identityBonus = 2;
  } else if (pathLower.includes("samurai") && persona.id === "musashi") {
    identityBonus = 3;
  } else if (pathLower.includes("warrior") && persona.archetype === "military") {
    identityBonus = 2;
  } else if (pathLower.includes("zen") && persona.archetype === "spiritual") {
    identityBonus = 2;
  } else if (pathLower.includes("leader") && persona.archetype === "industry") {
    identityBonus = 2;
  } else if (pathLower.includes("creator") && persona.archetype === "creative") {
    identityBonus = 2;
  }

  // Emotional state matching
  let emotionBonus = 0;
  if (state.emotion === "low" || state.emotion === "defeated") {
    // Need high-energy motivators
    if (["goggins", "robbins", "eric_thomas", "ali"].includes(persona.id)) {
      emotionBonus = 2;
    }
  } else if (state.emotion === "anxious" || state.emotion === "overwhelmed") {
    // Need calm, grounding voices
    if (persona.archetype === "spiritual" || persona.archetype === "philosophy") {
      emotionBonus = 2;
    }
  } else if (state.emotion === "angry") {
    // Need calming wisdom
    if (["aurelius", "seneca", "epictetus", "tolle"].includes(persona.id)) {
      emotionBonus = 3;
    }
  }

  // Recent patterns adjustment
  if (state.recentPatterns.includes("avoidance")) {
    if (["goggins", "jocko", "pressfield", "mel_robbins"].includes(persona.id)) {
      emotionBonus += 2;
    }
  }
  if (state.recentPatterns.includes("burnout")) {
    if (persona.archetype === "spiritual" || persona.defaultIntensity === "low") {
      emotionBonus += 2;
    }
  }
  if (state.recentPatterns.includes("self-criticism")) {
    if (["brene_brown", "dalai_lama", "tolle"].includes(persona.id)) {
      emotionBonus += 3;
    }
  }

  return baseScore + historyBonus + identityBonus + emotionBonus;
}

// Determine intensity based on state
function determineIntensity(state: UserMotivationalState): "low" | "medium" | "high" {
  // Prefer gentle if user wants it
  if (state.prefersGentle) return "low";

  // High urgency + low energy = needs a push
  if (state.urgency === "high" && state.energyLevel <= 2) return "high";

  // Low urgency = gentler approach
  if (state.urgency === "low") return "low";

  // Emotional states that need gentleness
  if (["anxious", "overwhelmed", "scared", "hopeless"].includes(state.emotion)) {
    return "low";
  }

  // Emotional states that can handle intensity
  if (["flat", "tired", "low", "defeated"].includes(state.emotion)) {
    return state.energyLevel <= 2 ? "high" : "medium";
  }

  return "medium";
}

// Main routing function
export function routeMotivation(
  state: UserMotivationalState,
  history: PersonaEffectivenessMap = {}
): RoutingDecision {
  // Get candidates matching needs
  let candidates = personasForNeeds(state.needs);

  // Filter by gentleness preference
  candidates = filterByGentleness(candidates, state.prefersGentle);

  // If no candidates, fall back to all personas
  if (candidates.length === 0) {
    candidates = state.prefersGentle
      ? PERSONAS.filter((p) => p.defaultIntensity !== "high")
      : PERSONAS;
  }

  // Score and sort candidates
  const scored = candidates
    .map((p) => ({ persona: p, score: scorePersona(p, state, history) }))
    .sort((a, b) => b.score - a.score);

  // Take top 1-3 personas
  const topCount = Math.min(3, Math.max(1, Math.ceil(state.needs.length / 2)));
  const top = scored.slice(0, topCount).map((s) => s.persona);

  // Determine intensity
  const intensity = determineIntensity(state);

  return {
    personas: top,
    intensity,
  };
}

// Classify user input into motivational state (simplified version)
// In production, this would use GPT for more accurate classification
export function classifyUserState(
  rawText: string,
  context?: {
    identityPath?: string;
    recentPatterns?: string[];
    prefersGentle?: boolean;
  }
): UserMotivationalState {
  const text = rawText.toLowerCase();

  // Detect emotional state
  let emotion: UserMotivationalState["emotion"] = "fine";
  if (text.includes("depressed") || text.includes("hopeless") || text.includes("can't do")) {
    emotion = "hopeless";
  } else if (text.includes("anxious") || text.includes("worried") || text.includes("nervous")) {
    emotion = "anxious";
  } else if (text.includes("overwhelmed") || text.includes("too much")) {
    emotion = "overwhelmed";
  } else if (text.includes("angry") || text.includes("frustrated") || text.includes("pissed")) {
    emotion = "angry";
  } else if (text.includes("tired") || text.includes("exhausted") || text.includes("drained")) {
    emotion = "tired";
  } else if (text.includes("stuck") || text.includes("unmotivated") || text.includes("lazy")) {
    emotion = "flat";
  } else if (text.includes("stressed") || text.includes("pressure")) {
    emotion = "stressed";
  } else if (text.includes("low") || text.includes("down") || text.includes("sad")) {
    emotion = "low";
  } else if (text.includes("scared") || text.includes("afraid") || text.includes("fear")) {
    emotion = "scared";
  }

  // Detect energy level
  let energyLevel: 1 | 2 | 3 | 4 | 5 = 3;
  if (text.includes("exhausted") || text.includes("no energy") || text.includes("can't move")) {
    energyLevel = 1;
  } else if (text.includes("tired") || text.includes("drained")) {
    energyLevel = 2;
  } else if (text.includes("pumped") || text.includes("ready") || text.includes("excited")) {
    energyLevel = 5;
  }

  // Detect urgency
  let urgency: "low" | "medium" | "high" = "medium";
  if (text.includes("right now") || text.includes("urgent") || text.includes("deadline") || text.includes("today")) {
    urgency = "high";
  } else if (text.includes("eventually") || text.includes("someday") || text.includes("no rush")) {
    urgency = "low";
  }

  // Detect needs
  const needs: MotivationalNeed[] = [];

  if (text.includes("discipline") || text.includes("routine") || text.includes("consistent")) {
    needs.push("discipline");
  }
  if (text.includes("courage") || text.includes("brave") || text.includes("scary")) {
    needs.push("courage");
  }
  if (text.includes("believe") || text.includes("doubt") || text.includes("can i")) {
    needs.push("self-belief");
  }
  if (text.includes("calm") || text.includes("peace") || text.includes("relax")) {
    needs.push("calm");
  }
  if (text.includes("clarity") || text.includes("confused") || text.includes("direction")) {
    needs.push("clarity");
  }
  if (text.includes("forgive") || text.includes("mistake") || text.includes("failed") || text.includes("guilt")) {
    needs.push("self-forgiveness");
  }
  if (text.includes("bounce back") || text.includes("setback") || text.includes("keep going")) {
    needs.push("resilience");
  }
  if (text.includes("focus") || text.includes("distracted") || text.includes("concentrate")) {
    needs.push("focus");
  }
  if (text.includes("procrastin") || text.includes("putting off") || text.includes("start") || text.includes("lazy")) {
    needs.push("anti-procrastination");
  }
  if (text.includes("purpose") || text.includes("meaning") || text.includes("why")) {
    needs.push("purpose");
  }
  if (text.includes("confident") || text.includes("insecure") || text.includes("imposter")) {
    needs.push("confidence");
  }
  if (text.includes("strategy") || text.includes("plan") || text.includes("how to")) {
    needs.push("tactical-strategy");
  }
  if (text.includes("energy") || text.includes("motivation") || text.includes("drive")) {
    needs.push("energy");
  }
  if (text.includes("patient") || text.includes("waiting") || text.includes("slow")) {
    needs.push("patience");
  }

  // Default needs if none detected
  if (needs.length === 0) {
    needs.push("energy", "action");
  }

  return {
    emotion,
    energyLevel,
    urgency,
    needs,
    prefersGentle: context?.prefersGentle ?? false,
    identityPath: context?.identityPath ?? "",
    recentPatterns: context?.recentPatterns ?? [],
  };
}

// Update persona effectiveness based on feedback
export function updatePersonaEffectiveness(
  history: PersonaEffectivenessMap,
  personaIds: string[],
  feedback: "better" | "same" | "worse",
  actionTaken: boolean
): PersonaEffectivenessMap {
  const updated = { ...history };

  const delta =
    feedback === "better" ? (actionTaken ? 3 : 1) :
    feedback === "same" ? 0 :
    actionTaken ? -1 : -2;

  for (const id of personaIds) {
    updated[id] = (updated[id] ?? 0) + delta;
  }

  return updated;
}
