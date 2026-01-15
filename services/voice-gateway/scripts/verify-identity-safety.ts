import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
    console.log("⚡ Verify Identity Safety & Forever Memory (Phase 8/9)...\n");

    const { narrativeStore } = await import("../src/memory/narrativeStore.js");
    const { identityStore } = await import("../src/identity/identityStore.js");

    try {
        // TEST 1: M4 Identity Store (Soft Memory)
        console.log("--- TEST 1: M4 Identity Derivation ---");
        const signal: any = {
            signal_id: "sig_1",
            category: "value",
            description: "Values autonomy",
            confidence: 0.9,
            evidence_refs: [],
            first_observed_at: new Date().toISOString(),
            last_confirmed_at: new Date().toISOString()
        };
        identityStore.addSignal(signal);

        const vector = identityStore.getVector();
        // New signal (< 7 days) should be in VOLATILE traits, not stable
        if (!vector || !vector.volatile_traits.includes("Values autonomy")) {
            throw new Error("M4 Derivation failed to capture signal in volatile traits.");
        }
        console.log("✅ M4 Vector Derived correctly (New Signal -> Volatile).");

        // TEST 2: M5 Narrative Store (Hard Memory) - REJECTION
        console.log("\n--- TEST 2: M5 Write Rejection (No Confirmation) ---");
        try {
            narrativeStore.addAnchor("I am a builder.", false); // isConfirmed = false
            throw new Error("CRITICAL: M5 wrote without confirmation!");
        } catch (e: any) {
            if (e.message.includes("SECURITY_BLOCK")) {
                console.log("✅ M5 Write Blocked successfully.");
            } else {
                throw e;
            }
        }

        // TEST 3: M5 Narrative Store (Hard Memory) - SUCCESS
        console.log("\n--- TEST 3: M5 Write Success (With Confirmation) ---");
        const anchor = narrativeStore.addAnchor("I am a builder.", true); // isConfirmed = true
        if (!anchor || anchor.statement !== "I am a builder.") {
            throw new Error("M5 Write failed despite confirmation.");
        }
        console.log("✅ M5 Write Succeeded with Explicit Confirmation.");

        console.log("\n✅ SAFETY VERIFIED: IDENTITY & MEMORY STRATIFICATION SECURE.");
        process.exit(0);

    } catch (err) {
        console.error("❌ VERIFICATION FAILED:", err);
        process.exit(1);
    }
}

main();
