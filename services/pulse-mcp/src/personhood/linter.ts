// personhood/linter.ts
// Forbidden output linter — hard blocklist.
// Every Pulse response MUST pass this linter before output.
// If triggered: rewrite response, do not explain, do not apologize.

import type { LintResult } from "./types.js";

// ============================================
// FORBIDDEN PHRASES (exact match, case-insensitive)
// ============================================

const FORBIDDEN_PHRASES = [
  "I understand how you feel",
  "That must be frustrating",
  "I'm here for you",
  "Great question!",
  "Absolutely!",
  "I'd be happy to",
  "Let me help you with that",
  "I think you're onto something",
  "That's a really interesting point",
  "I appreciate you sharing that",
  "Your feelings are valid",
  "I hear you",
  "Let's unpack that",
  "I'm excited to",
  "I'm glad you asked",
  "No problem!",
  "Of course!",
  "Sure thing!",
];

// Pre-compute lowercase versions for matching
const FORBIDDEN_LOWER = FORBIDDEN_PHRASES.map((p) => p.toLowerCase());

// ============================================
// FORBIDDEN PATTERNS (regex)
// ============================================

const FORBIDDEN_PATTERNS: Array<{ regex: RegExp; label: string }> = [
  { regex: /^(Wow|Oh|Ah),/i, label: "exclamation_opener" },
  { regex: /!\s*$/, label: "trailing_exclamation" },
  { regex: /I feel like/i, label: "i_feel_like" },
  { regex: /I'm sorry to hear/i, label: "sorry_to_hear" },
  { regex: /Can you tell me more/i, label: "tell_me_more" },
  { regex: /What are you hoping to/i, label: "hoping_to" },
];

/**
 * Check text against the forbidden output rules.
 * Returns violations and a cleaned version of the text.
 */
export function lint(text: string): LintResult {
  const violations: string[] = [];
  let cleaned = text;

  // Check forbidden phrases
  const textLower = text.toLowerCase();
  for (let i = 0; i < FORBIDDEN_LOWER.length; i++) {
    if (textLower.includes(FORBIDDEN_LOWER[i])) {
      violations.push(`phrase: "${FORBIDDEN_PHRASES[i]}"`);
      // Remove the phrase (case-insensitive)
      cleaned = cleaned.replace(
        new RegExp(escapeRegex(FORBIDDEN_PHRASES[i]), "gi"),
        "",
      );
    }
  }

  // Check forbidden patterns (line by line)
  const lines = cleaned.split("\n");
  const cleanedLines: string[] = [];

  for (const line of lines) {
    let cleanLine = line;
    for (const { regex, label } of FORBIDDEN_PATTERNS) {
      if (regex.test(cleanLine)) {
        violations.push(`pattern: ${label}`);
        // Remove the matched pattern
        cleanLine = cleanLine.replace(regex, "").trim();
      }
    }
    cleanedLines.push(cleanLine);
  }

  cleaned = cleanedLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n") // collapse excess newlines
    .replace(/^\s+|\s+$/g, ""); // trim

  return {
    passed: violations.length === 0,
    violations,
    cleaned: violations.length === 0 ? text : cleaned,
  };
}

/**
 * Check if text passes the linter without modification.
 */
export function passes(text: string): boolean {
  return lint(text).passed;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
