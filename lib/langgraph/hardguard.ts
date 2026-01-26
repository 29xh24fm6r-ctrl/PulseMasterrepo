// lib/langgraph/hardguard.ts
// Pulse HardGuard: Deterministic safety constraints that can veto LLM decisions

import type { OmegaState } from "./types";

export interface HardGuardResult {
  hardApproved: boolean;
  hardBlocks: string[];
  requiresHumanReview: boolean;
}

// Keywords that indicate high-risk content requiring human review
const RISK_KEYWORDS = [
  "wire",
  "ach transfer",
  "send money",
  "bank account",
  "routing number",
  "ssn",
  "social security",
  "password",
  "credential",
  "login",
  "legal",
  "contract",
  "sign",
  "lawsuit",
  "settlement",
  "tax",
  "crypto",
  "bitcoin",
  "wallet address",
  "private key",
  "api key",
  "secret",
  "confidential",
  "nda",
];

// Draft types that involve external communication
const COMMS_DRAFT_TYPES = new Set(["email", "message", "sms", "slack", "notification"]);

/**
 * Pulse HardGuard - Deterministic safety layer
 *
 * This function performs code-based safety checks that can override
 * LLM-based Guardian decisions. It ensures:
 *
 * 1. External communications are never auto-executed without explicit permission
 * 2. High-risk content (financial, legal, credentials) forces human review
 * 3. System errors always require human review
 *
 * @param state - The current Omega state after LLM processing
 * @returns HardGuardResult with approval status and blocking reasons
 */
export function hardGuard(state: OmegaState): HardGuardResult {
  const blocks: string[] = [];

  // Rule 1: Must have a draft to approve
  if (!state.draft) {
    blocks.push("HardGuard: No draft present.");
  }

  // Rule 2: Never auto-execute external communications without explicit permission
  const draftType = state.draft?.draftType ?? "";
  const isComms = COMMS_DRAFT_TYPES.has(draftType);
  const allowAutoComms = state.userContext?.preferences?.allowAutoComms === true;

  if (isComms && !allowAutoComms) {
    blocks.push(
      "HardGuard: External communications cannot be auto-executed without allowAutoComms=true."
    );
  }

  // Rule 3: Keyword-based high-risk detection
  const draftContent = state.draft?.content ?? {};
  const serialized = JSON.stringify(draftContent).toLowerCase();
  const titleLower = (state.draft?.title ?? "").toLowerCase();
  const combinedText = serialized + " " + titleLower;

  for (const keyword of RISK_KEYWORDS) {
    if (combinedText.includes(keyword)) {
      blocks.push(`HardGuard: Draft contains high-risk keyword "${keyword}".`);
      break; // Only report first match to avoid noise
    }
  }

  // Rule 4: Check simulations for high-risk flags
  const simText = JSON.stringify(state.simulations ?? []).toLowerCase();
  const simHighRisk =
    simText.includes('"riskassessment":"high"') ||
    simText.includes('"risk_assessment":"high"') ||
    simText.includes('"recommendation":"abort"') ||
    simText.includes('"recommendation":"reject"');

  if (simHighRisk) {
    blocks.push("HardGuard: Simulations indicate high risk or abort recommendation.");
  }

  // Rule 5: Low confidence drafts require review
  const draftConfidence = state.draft?.confidence ?? 0;
  if (state.draft && draftConfidence < 0.5) {
    blocks.push(`HardGuard: Draft confidence too low (${draftConfidence.toFixed(2)} < 0.5).`);
  }

  // Determine if human review is required
  const hasErrors = (state.errors ?? []).length > 0;
  const hasCognitiveIssues = (state.cognitiveIssues ?? []).length > 0;
  const requiresHumanReview = blocks.length > 0 || simHighRisk || hasErrors || hasCognitiveIssues;

  return {
    hardApproved: blocks.length === 0,
    hardBlocks: blocks,
    requiresHumanReview,
  };
}

/**
 * Check if a specific draft type is considered external communication
 */
export function isExternalCommunication(draftType: string): boolean {
  return COMMS_DRAFT_TYPES.has(draftType);
}

/**
 * Check if content contains any high-risk keywords
 */
export function containsRiskKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  return RISK_KEYWORDS.filter((kw) => lower.includes(kw));
}
