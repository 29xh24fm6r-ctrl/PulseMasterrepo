import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
    console.log("⚡ Verify Gemini Data Contract (Phase 8/9)...\n");

    const { geminiGate } = await import("../src/identity/geminiGate.js");
    const { GeminiInsightEnvelope } = await import("../src/identity/identityTypes.js");

    try {
        // TEST 1: Reject Low Confidence
        console.log("--- TEST 1: Reject Low Confidence ---");
        const lowConfDetails: any = {
            identity_signals: [],
            trajectory_deltas: [],
            confidence_summary: { overall_confidence: 0.4, data_sufficiency: "high" }, // < 0.6
            generated_at: new Date().toISOString()
        };
        const result1 = geminiGate.validateEnvelope(lowConfDetails);
        if (result1 !== null) throw new Error("CRITICAL: Failed to block low confidence envelope.");
        console.log("✅ Low confidence rejected.");

        // TEST 2: Reject Low Sufficiency
        console.log("\n--- TEST 2: Reject Low Sufficiency ---");
        const lowSuffDetails: any = {
            identity_signals: [],
            trajectory_deltas: [],
            confidence_summary: { overall_confidence: 0.9, data_sufficiency: "low" },
            generated_at: new Date().toISOString()
        };
        const result2 = geminiGate.validateEnvelope(lowSuffDetails);
        if (result2 !== null) throw new Error("CRITICAL: Failed to block low sufficiency envelope.");
        console.log("✅ Low data sufficiency rejected.");

        // TEST 3: Accept Valid
        console.log("\n--- TEST 3: Accept Valid Envelope ---");
        const validDetails: any = {
            identity_signals: [{
                signal_id: "test",
                category: "value",
                description: "Test signal",
                confidence: 0.8,
                evidence_refs: [],
                first_observed_at: new Date().toISOString(),
                last_confirmed_at: new Date().toISOString()
            }],
            trajectory_deltas: [],
            confidence_summary: { overall_confidence: 0.8, data_sufficiency: "high" },
            generated_at: new Date().toISOString()
        };
        const result3 = geminiGate.validateEnvelope(validDetails);
        if (!result3) throw new Error("CRITICAL: Failed to accept valid envelope.");
        console.log("✅ Valid envelope accepted.");

        console.log("\n✅ CONTRACT VERIFIED: STRICT JSON & CONFIDENCE GATES WORKING.");
        process.exit(0);

    } catch (err) {
        console.error("❌ VERIFICATION FAILED:", err);
        process.exit(1);
    }
}

main();
