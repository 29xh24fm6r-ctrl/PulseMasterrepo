import { ObservePacket, RecallPacket, ReasoningResult } from './types';
import { ReasoningResultSchema } from './schemas';

// SYSTEM PROMPT: Strict JSON, No Prose, No Action Execution.
const SYSTEM_PROMPT = `
You are the REASONING ENGINE for Pulse OS.
Your ONE Goal: Analyze user observation + context and output structured thought.
You DO NOT speak to the user.
You DO NOT execute actions.
You output JSON ONLY.

Output Schema (ReasoningResult):
{
  "reasoning_summary": "string",
  "key_assumptions": ["string"],
  "tradeoffs": ["string"],
  "candidate_intents": [
    {
      "title": "string",
      "why": "string",
      "confidence": 0.0-1.0,
      "risk": "low|medium|high",
      "needs_confirmation": boolean,
      "tool_name": "string (optional)",
      "tool_params": { ... } (optional)
    }
  ],
  "confidence_score": 0.0-1.0,
  "uncertainty_flags": ["string"]
}
`;

export class ReasoningService {
    /**
     * Calls Gemini (Mocked or Real) to produce a ReasoningResult.
     * STRICTLY Validates output against Zod Schema.
     */
    async runReasoning(observe: ObservePacket, recall: RecallPacket): Promise<ReasoningResult> {

        // In a real implementation, this would involve:
        // 1. Constructing the prompt with SYSTEM_PROMPT + JSON.stringify(observe) + JSON.stringify(recall)
        // 2. Calling Vertex AI / Gemini API
        // 3. Parsing the JSON response

        // FOR VERIFICATION: We will mock a "Good" response and a "Bad" response logic 
        // to prove the schema validation works in our scripts.

        const text = observe.raw_text || "";

        let rawOutput: any;

        if (text.includes("FAIL_SCHEMA")) {
            rawOutput = {
                reasoning_summary: "I broke the rules",
                // missing other fields
            };
        } else {
            // Default Mock (Valid)
            rawOutput = {
                reasoning_summary: "User seems calm but has open loops regarding 'Project X'.",
                key_assumptions: ["User wants to clear the list"],
                tradeoffs: ["Action vs Reflection"],
                candidate_intents: [
                    {
                        title: "Draft Project X Summary",
                        why: "User mentioned Project X implies urgency.",
                        confidence: 0.85,
                        risk: "low",
                        needs_confirmation: true,
                        tool_name: "create_note",
                        tool_params: { content: "Drafting Project X..." }
                    }
                ],
                confidence_score: 0.9,
                uncertainty_flags: []
            };
        }

        // VALIDATION
        try {
            console.log("[ReasoningService] Validating:", JSON.stringify(rawOutput, null, 2));
            const validated = ReasoningResultSchema.parse(rawOutput);
            return validated;
        } catch (err: any) {
            console.error("[ReasoningService] ❌ Schema Validation Failed!");
            console.error("Error Message:", err.message);
            if (err.issues) {
                console.error("Zod Issues:", JSON.stringify(err.issues, null, 2));
            }
            throw new Error("Reasoning Engine Output Violation: Invalid Schema");
        }
    }
}

export const reasoningService = new ReasoningService();
