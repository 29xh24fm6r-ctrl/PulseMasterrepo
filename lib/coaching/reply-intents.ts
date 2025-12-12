// Reply Intents
// lib/coaching/reply-intents.ts

export type ReplyIntentId =
  | "soothe"
  | "stabilize"
  | "hype"
  | "challenge"
  | "clarify"
  | "plan"
  | "celebrate"
  | "reframe";

export interface ReplyIntent {
  id: ReplyIntentId;
  label: string;
  description: string;
  // knobs that will inform the LLM prompt
  maxWords: number;
  directness: "soft" | "balanced" | "hard";
  structure: "bullet_plan" | "short_paragraph" | "dialogue" | "story";
  focus: "emotion" | "action" | "mixed";
}

export const REPLY_INTENTS: ReplyIntent[] = [
  {
    id: "soothe",
    label: "Soothe",
    description: "Regulate and comfort the user, lower emotional intensity.",
    maxWords: 160,
    directness: "soft",
    structure: "short_paragraph",
    focus: "emotion",
  },
  {
    id: "stabilize",
    label: "Stabilize",
    description: "Acknowledge emotion, then bring user back to grounded clarity.",
    maxWords: 200,
    directness: "balanced",
    structure: "short_paragraph",
    focus: "mixed",
  },
  {
    id: "hype",
    label: "Hype",
    description: "Energize and motivate the user into action.",
    maxWords: 160,
    directness: "balanced",
    structure: "short_paragraph",
    focus: "action",
  },
  {
    id: "challenge",
    label: "Challenge",
    description: "Lovingly push the user, call out excuses, increase standards.",
    maxWords: 180,
    directness: "hard",
    structure: "short_paragraph",
    focus: "action",
  },
  {
    id: "clarify",
    label: "Clarify",
    description: "Ask questions and simplify confusion into one clear next step.",
    maxWords: 140,
    directness: "balanced",
    structure: "short_paragraph",
    focus: "action",
  },
  {
    id: "plan",
    label: "Plan",
    description: "Turn chaos into a simple concrete step-by-step plan.",
    maxWords: 220,
    directness: "balanced",
    structure: "bullet_plan",
    focus: "action",
  },
  {
    id: "celebrate",
    label: "Celebrate",
    description: "Celebrate progress, reinforce identity and wins.",
    maxWords: 120,
    directness: "soft",
    structure: "short_paragraph",
    focus: "emotion",
  },
  {
    id: "reframe",
    label: "Reframe",
    description: "Shift how the user sees the situation into a more empowering frame.",
    maxWords: 180,
    directness: "balanced",
    structure: "short_paragraph",
    focus: "emotion",
  },
];

/**
 * Get intent by ID
 */
export function getIntentById(id: ReplyIntentId): ReplyIntent {
  const intent = REPLY_INTENTS.find((i) => i.id === id);
  if (!intent) throw new Error(`Unknown reply intent: ${id}`);
  return intent;
}

