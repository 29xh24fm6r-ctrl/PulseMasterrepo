/**
 * Email Resolution Engine
 * 
 * Core intelligence that determines what state an email thread should be in
 * based on detected obligations, questions, deadlines, and waiting states.
 * 
 * Every email thread MUST have exactly one resolution state at all times.
 */

export type EmailResolutionState =
  | "needs_user_action"
  | "waiting_on_other"
  | "scheduled_follow_up"
  | "converted_to_task"
  | "resolved";

export type ResolutionInput = {
  hasQuestion: boolean;
  hasDeadline: boolean;
  waitingOnOther: boolean;
  hasCommitment?: boolean;
  hasRequest?: boolean;
};

export type ResolutionResult = {
  state: EmailResolutionState;
  why: string;
  evidence: string[];
  confidence: number; // 0-100
};

/**
 * Resolves an email thread's state based on detected obligations.
 * 
 * RULES:
 * 1. If waiting on other party → "waiting_on_other"
 * 2. If has question, deadline, request, or commitment → "needs_user_action"
 * 3. Otherwise → "resolved" (informational only)
 * 
 * This ensures NO email is left unaccounted for.
 */
export function resolveEmailThread(input: ResolutionInput): ResolutionResult {
  // Rule 1: Waiting states take precedence
  if (input.waitingOnOther) {
    return {
      state: "waiting_on_other",
      why: "Awaiting response from the other party",
      evidence: ["Outbound message sent", "No reply yet"],
      confidence: 95,
    };
  }

  // Rule 2: Any obligation requires user action
  if (input.hasQuestion || input.hasDeadline || input.hasRequest || input.hasCommitment) {
    const evidence: string[] = [];
    
    if (input.hasQuestion) evidence.push("Question detected");
    if (input.hasDeadline) evidence.push("Deadline language present");
    if (input.hasRequest) evidence.push("Request identified");
    if (input.hasCommitment) evidence.push("Commitment required");

    return {
      state: "needs_user_action",
      why: "A response or commitment is required",
      evidence,
      confidence: 90,
    };
  }

  // Rule 3: Informational only
  return {
    state: "resolved",
    why: "No outstanding obligations detected",
    evidence: ["Informational content only"],
    confidence: 85,
  };
}

/**
 * Validates that a resolution state transition is allowed.
 * Prevents invalid state changes (e.g., "resolved" → "needs_user_action").
 */
export function canTransitionState(
  from: EmailResolutionState,
  to: EmailResolutionState
): boolean {
  // Once resolved, cannot go back (except manually)
  if (from === "resolved" && to !== "resolved") {
    return false;
  }

  // Once converted to task, cannot go back to needs_user_action
  if (from === "converted_to_task" && to === "needs_user_action") {
    return false;
  }

  // All other transitions are allowed
  return true;
}

