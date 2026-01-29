// personhood/recovery.ts
// Failure recovery protocol — no groveling.
//
// If tone is wrong:
//   Forbidden: apologies, meta-commentary, explanations
//   Allowed:   "Let me try that again.", "Different angle:", silent correction
//
// Rules:
//   never_apologize_for_tone: true
//   never_explain_misread: true
//   just_retry_cleanly: true
//   max_retries_before_asking: 2

const RECOVERY_PREFIXES = [
  "Let me try that again.",
  "Different angle:",
  "", // silent correction (no prefix)
];

const APOLOGY_PATTERNS = [
  /I('m| am) sorry/i,
  /my apologies/i,
  /I apologize/i,
  /sorry about that/i,
  /I didn't mean to/i,
  /I shouldn't have/i,
  /that was my mistake/i,
  /let me correct myself/i,
  /I misjudged/i,
  /I misread/i,
];

const META_PATTERNS = [
  /I (realize|notice|see) (that )?(my|the) tone/i,
  /I was being too/i,
  /that came across as/i,
  /I should have been more/i,
  /looking at (this|that) again/i,
];

/**
 * Check if text contains apology or meta-commentary about tone.
 */
export function containsGroveling(text: string): boolean {
  for (const pattern of APOLOGY_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  for (const pattern of META_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  return false;
}

/**
 * Strip apology/meta-commentary from text and optionally add a clean recovery prefix.
 * Returns the cleaned text.
 */
export function cleanRecovery(
  text: string,
  retryCount: number = 0,
): string {
  let cleaned = text;

  // Remove apology sentences
  for (const pattern of [...APOLOGY_PATTERNS, ...META_PATTERNS]) {
    // Remove entire sentences containing the pattern
    const sentences = cleaned.split(/(?<=[.!])\s+/);
    cleaned = sentences.filter((s) => !pattern.test(s)).join(" ").trim();
  }

  // Add recovery prefix if this is a retry (but not on first attempt)
  if (retryCount > 0 && retryCount <= 2) {
    const prefix = RECOVERY_PREFIXES[retryCount - 1] ?? "";
    if (prefix) {
      cleaned = `${prefix} ${cleaned}`;
    }
  }

  return cleaned;
}

/**
 * Maximum retries before asking the user for guidance.
 */
export const MAX_RETRIES_BEFORE_ASKING = 2;
