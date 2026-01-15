import { ReasoningResultSchema, CandidateIntentSchema } from '../lib/brain/schemas';

const mock = {
    "reasoning_summary": "User seems calm but has open loops regarding 'Project X'.",
    "key_assumptions": [
        "User wants to clear the list"
    ],
    "tradeoffs": [
        "Action vs Reflection"
    ],
    "candidate_intents": [
        {
            "title": "Draft Project X Summary",
            "why": "User mentioned Project X implies urgency.",
            "confidence": 0.85,
            "risk": "low",
            "needs_confirmation": true,
            "tool_name": "create_note",
            "tool_params": {
                "content": "Drafting Project X..."
            }
        }
    ],
    "confidence_score": 0.9,
    "uncertainty_flags": []
};

console.log("Testing CandidateIntentSchema...");
try {
    CandidateIntentSchema.parse(mock.candidate_intents[0]);
    console.log("✅ CandidateIntentSchema Passed");
} catch (e) {
    console.error("❌ CandidateIntentSchema Failed", e);
}

console.log("Testing ReasoningResultSchema...");
try {
    ReasoningResultSchema.parse(mock);
    console.log("✅ ReasoningResultSchema Passed");
} catch (e) {
    console.error("❌ ReasoningResultSchema Failed", e);
}
