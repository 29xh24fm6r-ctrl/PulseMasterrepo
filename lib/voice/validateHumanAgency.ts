import { FORBIDDEN_AGENCY_PHRASES } from "./forbiddenPhrases";

/**
 * Validates that a string does not contain any forbidden agency phrases.
 * Throws a runtime error if a violation is detected.
 *
 * @param text The text to validate (UI string or Voice transcript)
 * @param context Optional context for the error message
 */
export function validateHumanAgency(text: string, context?: string): void {
    if (!text) return;

    const normalized = text.toLowerCase();

    for (const phrase of FORBIDDEN_AGENCY_PHRASES) {
        if (normalized.includes(phrase.toLowerCase())) {
            throw new Error(
                `[AGENCY VIOLATION] Pulse attempted to use forbidden phrase: "${phrase}" in "${text}" (Context: ${context || 'Unknown'})`
            );
        }
    }
}
