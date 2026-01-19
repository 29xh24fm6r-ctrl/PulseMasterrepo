/**
 * Enforces the "Non-Directive" invariant for Phase 16.
 * Pulse must never use language that implies obligation, directive control, or fixed future tasks.
 */
const DIRECTIVE_PHRASES = [
    "you should",
    "you need to",
    "you must",
    "we need to",
    "let's fix",
    "let's make sure",
    "tomorrow you",
    "don't forget",
    "make sure to",
    "i recommend",
    "it is important that",
    "try to"
];

export function validateNonDirective(text: string, context?: string): void {
    const lower = text.toLowerCase();

    for (const phrase of DIRECTIVE_PHRASES) {
        if (lower.includes(phrase)) {
            throw new Error(
                `[AGENCY VIOLATION] Pulse attempted to use directive language: "${phrase}" in "${text}". Context: ${context || 'Unknown'}`
            );
        }
    }
}
