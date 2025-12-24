/**
 * Pulse Reply Generator
 * 
 * Generates contextually appropriate reply drafts based on intent.
 * V1 is deterministic (template-based). V2+ will be AI-driven with evidence.
 */

export type ReplyIntent = 
  | "confirm"
  | "decline"
  | "buy_time"
  | "ask"
  | "commit"
  | "close";

export type PulseReplyDraft = {
  body: string;
  intent: ReplyIntent;
  evidence: string[];
};

/**
 * Generates a Pulse reply draft based on intent.
 * 
 * V1: Deterministic templates
 * V2+: AI-generated with context awareness
 */
export function generatePulseReply(intent: ReplyIntent, context?: {
  subject?: string;
  originalMessage?: string;
}): PulseReplyDraft {
  const baseTemplates: Record<ReplyIntent, string> = {
    confirm: "Yes — that works on my end. I'll proceed and keep you posted.",
    decline: "I appreciate the offer, but I'm unable to commit at this time. Thanks for thinking of me.",
    buy_time: "Received — I'll review this and follow up shortly.",
    ask: "Can you clarify the following so I can proceed?",
    commit: "I'll take care of this and update you by [timeframe].",
    close: "Thanks for reaching out. I'll take care of this.",
  };

  const evidence: string[] = [];
  
  // Add context-based evidence
  if (context?.subject) {
    evidence.push(`Subject: ${context.subject}`);
  }
  
  // Intent-specific evidence
  switch (intent) {
    case "confirm":
      evidence.push("Confirmation intent detected");
      break;
    case "buy_time":
      evidence.push("Time-buying response appropriate");
      break;
    case "ask":
      evidence.push("Clarification needed");
      break;
    case "commit":
      evidence.push("Commitment detected in original message");
      break;
  }

  return {
    body: baseTemplates[intent],
    intent,
    evidence,
  };
}

/**
 * Detects reply intent from an email's content (heuristic-based V1).
 * 
 * This is a placeholder for AI-driven intent detection.
 */
export function detectReplyIntent(
  emailContent: string,
  hasQuestion: boolean,
  hasDeadline: boolean
): ReplyIntent {
  const content = emailContent.toLowerCase();

  // Question detection → ask for clarification
  if (hasQuestion) {
    return "ask";
  }

  // Deadline detection → commit with timeframe
  if (hasDeadline) {
    return "commit";
  }

  // Confirmation requests
  if (content.includes("confirm") || content.includes("works for you")) {
    return "confirm";
  }

  // Time-buying scenarios (need more info, need to check)
  if (content.includes("let me check") || content.includes("i'll get back")) {
    return "buy_time";
  }

  // Default: simple acknowledgment
  return "close";
}

