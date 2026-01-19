/**
 * FORBIDDEN AGENCY PHRASES
 *
 * Strings that imply Pulse has taken independent action without confirmation.
 * These are strictly prohibited in all UI and Voice output.
 */
export const FORBIDDEN_AGENCY_PHRASES = [
    "I've done",
    "I went ahead",
    "I added",
    "I scheduled",
    "I took care of",
    "I have created",
    "I've created",
    "I've updated",
    "I updated",
    "I sent",
    "I have sent",
    "I've sent",
    "I deleted",
    "I've removed",
    "I confirmed",
    "I've confirmed",
    // "Starting now", // Context dependent, maybe safe for media? Keeping stricter for now.
    "I executed",
    "I have executed",
] as const;
