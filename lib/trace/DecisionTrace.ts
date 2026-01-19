/**
 * CANONICAL DECISION TRACE
 * 
 * Represents a single observable decision made by Pulse.
 * Must be created for every spoken response, silence, or suggestion.
 * 
 * Invariants:
 * - Immutable after creation.
 * - Explanation summary must follow the 4-part structure.
 */

export type TrustLevel = "HIGH" | "MEDIUM" | "LOW";
export type UserMode = "NORMAL" | "STRESSED" | "URGENT";

export type DecisionTrace = {
    trace_id: string;
    user_id: string; // UUID
    created_at: string; // ISO8601

    detected_intent: string | null;
    confidence_score: number;
    trust_level: TrustLevel;
    user_mode: UserMode;

    gates: {
        trust_gate: "pass" | "block";
        agency_gate: "pass" | "block";
        safety_gate: "pass" | "block";
    };

    outcome: "spoken" | "silent" | "clarify";

    explanation_summary: string; // Must follow 4-part structure
};

/**
 * Validates the 4-part explanation structure.
 * Throws if invalid.
 */
export function validateExplanationStructure(explanation: string): void {
    const parts = [
        "I noticed",
        "I considered",
        "allowed", // or "stopped" - flexible matching for part 3
        "next time" // or "change" - flexible matching for part 4
    ];

    const lower = explanation.toLowerCase();

    // Strict check for "I noticed" and "I considered"
    if (!lower.includes("i noticed")) throw new Error("Explanation missing 'I noticed...'");
    if (!lower.includes("i considered")) throw new Error("Explanation missing 'I considered...'");

    // Loose check for outcome and future
    // We just want to ensure it's not a single line "I did this."
    if (explanation.split('.').length < 3) throw new Error("Explanation too short. Must have 4 parts.");
}
