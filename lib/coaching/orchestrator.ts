// Reply Orchestrator
// lib/coaching/orchestrator.ts

import { REPLY_INTENTS, ReplyIntent, ReplyIntentId, getIntentById } from "./reply-intents";

export type CoachId =
  | "sales"
  | "confidant"
  | "executive"
  | "warrior"
  | "negotiation"
  | "emotional"
  | "strategy";

export interface EmotionSnapshot {
  primary: string | null; // "stress" | "sad" | "hype" | "angry" | "calm" | null
  intensity?: number; // 0–1 if available from Emotion OS
}

export interface OrchestratorInput {
  coachId: CoachId;
  emotion: EmotionSnapshot;
  userMessage: string;
  // later: context like time of day, streak, XP state, etc.
}

export interface OrchestratorDecision {
  intent: ReplyIntent;
  rationale: string;
}

const intentMap: Record<CoachId, Partial<Record<string, ReplyIntentId>>> = {
  sales: {
    stress: "plan",
    sad: "soothe",
    hype: "hype",
    angry: "reframe",
    calm: "plan",
  },
  confidant: {
    stress: "stabilize",
    sad: "soothe",
    hype: "stabilize",
    angry: "reframe",
    calm: "clarify",
  },
  executive: {
    stress: "plan",
    sad: "stabilize",
    hype: "plan",
    angry: "clarify",
    calm: "plan",
  },
  warrior: {
    stress: "challenge",
    sad: "challenge",
    hype: "hype",
    angry: "challenge",
    calm: "plan",
  },
  negotiation: {
    stress: "plan",
    sad: "reframe",
    hype: "clarify",
    angry: "clarify",
    calm: "plan",
  },
  emotional: {
    stress: "stabilize",
    sad: "soothe",
    hype: "stabilize",
    angry: "reframe",
    calm: "clarify",
  },
  strategy: {
    stress: "plan",
    sad: "reframe",
    hype: "plan",
    angry: "clarify",
    calm: "plan",
  },
};

export function chooseReplyIntent(input: OrchestratorInput): OrchestratorDecision {
  const emotionKey = input.emotion.primary ?? "calm";
  const coachMapping = intentMap[input.coachId] ?? {};

  let chosenId = coachMapping[emotionKey] as ReplyIntentId | undefined;

  // Fallbacks
  if (!chosenId) {
    if (emotionKey === "stress" || emotionKey === "sad") {
      chosenId = "stabilize";
    } else if (emotionKey === "hype") {
      chosenId = "hype";
    } else {
      chosenId = "plan";
    }
  }

  const intent = getIntentById(chosenId);

  const rationale = `Chosen intent "${intent.label}" because coach=${input.coachId} and emotion=${emotionKey}.`;

  return { intent, rationale };
}

