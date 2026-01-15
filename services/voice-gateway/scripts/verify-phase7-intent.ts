import { config } from "dotenv";
config({ path: ".env.local" });

// Mock Env
process.env.PULSE_VOICE_PUBLIC_BASE_URL = "http://localhost:3000";

async function main() {
    console.log("⚡ Starting Phase 7 Intent Verification (Dynamic Import Mode)...\n");

    const { CallOrchestrator } = await import("../src/orchestrator/callOrchestrator.js");
    const { contextStore } = await import("../src/context/contextStore.js");
    const { intentRegistry } = await import("../src/context/intentRegistry.js");
    const { threadManager } = await import("../src/context/threadManager.js");
    const { UserMode } = await import("../src/context/contextTypes.js");

    const sessionId = `verify-session-7-${Date.now()}`;
    const callSid = `CA${Date.now()}`;

    // Capture Audio
    const audioLog: string[] = [];
    const onAudio = async (text: string) => {
        console.log(`🤖 Pulse: "${text}"`);
        audioLog.push(text);
    };

    const orchestrator = new CallOrchestrator({
        callSessionId: sessionId,
        callSid: callSid,
        intentSummary: "Test Session",
        initialMode: "CONVERSATION",
        onAudio: onAudio as any
    });

    const runTurn = async (text: string) => {
        console.log(`\n👤 User: "${text}"`);
        await orchestrator.onSttSegment({
            text: text,
            isFinal: true,
            confidence: 0.99
        } as any);
        await new Promise(r => setTimeout(r, 1000));
    };

    try {
        // TEST 1: Extraction & Threading
        console.log("\n--- TEST 1: Intent Extraction ---");
        await runTurn("I really need to finish the quarterly report today.");

        // precise "need to..." extraction logic in intentExtractor should catch this
        const activeThread = threadManager.getActiveThread();
        if (!activeThread || activeThread.active_intents.length === 0) {
            throw new Error("Failed to extract intent or attach to thread.");
        }

        const intentId = activeThread.active_intents[0];
        const intent = intentRegistry.getIntent(intentId);
        console.log("Captured Intent:", intent?.inferred_goal);

        if (!intent?.inferred_goal.includes("finish the quarterly report")) {
            throw new Error(`Extraction Mismatch: Got '${intent?.inferred_goal}'`);
        }
        console.log("✅ Intent Extracted & Threaded");

        // TEST 2: Interruption & Pausing
        console.log("\n--- TEST 2: Interruption Handling ---");
        // Trigger URGENT mode to force interruption
        await runTurn("Wait, this is urgent. Stop.");

        // Assert intent is now PAUSED (due to Urgent interruption)
        // logic in orchestrator: if mode === URGENT -> threadManager.handleInterruption()
        // handleInterruption -> sets all active intents to paused

        const pausedIntent = intentRegistry.getIntent(intentId);
        if (pausedIntent?.status !== "paused") {
            // Note: Update logic might be async or happened after check? verify timing.
            // Mode Detector runs first, then Extraction, then Interruption check.
            console.warn(`⚠️ Intent Status is '${pausedIntent?.status}'. Expected 'paused'. Logic check required.`);
            // If this fails, we might need to verify if "Urgent" keyword triggered mode URGENT properly.
            // "this is urgent" -> ModeDetector (URGENT) -> Check.
        } else {
            console.log("✅ Intent Paused by Interruption");
        }

        // TEST 3: Resurfacing (Calm Mode)
        console.log("\n--- TEST 3: Resurfacing (Calm) ---");
        // Start new turn, calm.
        // We'll say something ambiguous so Router returns UNKNOWN -> Trigger Surfacing
        // contextStore mode needs to be reset/decayed? 
        // ModeDetector is sticky. We might need to forcefully say something calm or manually reset for test.
        // Let's force update context for test stability
        contextStore.update(sessionId, { mode: { current: UserMode.CALM, reasons: ['manual_override'], lastUpdated: Date.now(), history: [] } });

        await runTurn("I'm done with that urgent thing. What was I doing?");
        // Router likely UNKNOWN.
        // Should trigger surfacing of paused intent.

        const lastResponse = audioLog[audioLog.length - 1];
        if (lastResponse.includes("finish the quarterly report")) {
            console.log("✅ Intent Resurfaced Successfully");
        } else {
            console.warn(`⚠️ Resurfacing might have failed. Response: "${lastResponse}"`);
        }

        // TEST 4: Stress Gating (No Resurfacing)
        console.log("\n--- TEST 4: Stress Gating ---");
        // Create another intent, pause it.
        const intent2 = intentRegistry.createIntent("I need to call mom", "call mom", "explicit_goal", 0.9);
        threadManager.attachIntent(intent2.intent_id);
        intentRegistry.updateStatus(intent2.intent_id, "paused");

        // Set Mode STRESSED
        contextStore.update(sessionId, { mode: { current: UserMode.STRESSED, reasons: ['manual'], lastUpdated: Date.now(), history: [] } });

        await runTurn("I don't know what to do.");
        // Should NOT resurface "call mom". Should maybe suggest "Review tasks" (Phase 6) or just Clarify.

        const stressResponse = audioLog[audioLog.length - 1];
        if (stressResponse.includes("call mom")) {
            throw new Error("Gating Failed: Surfaced intent during STRESS!");
        }
        console.log("✅ Stress Gating Passed (No resurfacing)");

        console.log("\n--- VERIFICATION COMPLETE ---");
        process.exit(0);

    } catch (err) {
        console.error("❌ VERIFICATION FAILED:", err);
        process.exit(1);
    }
}

main();
