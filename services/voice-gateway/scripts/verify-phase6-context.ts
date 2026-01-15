import { config } from "dotenv";
config({ path: ".env.local" });

// Mock Env for Test
process.env.PULSE_VOICE_PUBLIC_BASE_URL = "http://localhost:3000";

async function main() {
    console.log("⚡ Starting Phase 6 Context Verification (Dynamic Import Mode)...\n");

    // Dynamic Imports to ensure env vars are loaded first
    const { CallOrchestrator, SpeechSignal } = await import("../src/orchestrator/callOrchestrator.js");
    const { contextStore } = await import("../src/context/contextStore.js");
    const { UserMode } = await import("../src/context/contextTypes.js");

    const sessionId = `verify-session-${Date.now()}`;
    const callSid = `CA${Date.now()}`;

    // Mock Audio Output Capture
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

    // Helper to run a turn
    const runTurn = async (text: string) => {
        console.log(`\n👤 User: "${text}"`);
        await orchestrator.onSttSegment({
            text: text,
            isFinal: true,
            confidence: 0.99
        } as any);
        // Wait a bit for processing
        await new Promise(r => setTimeout(r, 2000));
    };

    try {
        // TEST 1: Mode Detection (STRESSED)
        console.log("\n--- TEST 1: Mode Detection (STRESSED) ---");
        await runTurn("Shit, I am completely overwhelmed today.");

        const ctx1 = contextStore.get(sessionId);
        if (ctx1.mode.current !== UserMode.STRESSED) {
            console.warn(`⚠️ Mode Mismatch: Expected STRESSED, got ${ctx1.mode.current}. Check keywords.`);
        } else {
            console.log("✅ Mode detected as STRESSED");
        }

        // TEST 2: Reference Resolution (Pronoun)
        console.log("\n--- TEST 2: Intent + Reference (it) ---");
        await runTurn("Remind me to buy milk.");
        await runTurn("Actually make it organic milk.");

        const ctx2 = contextStore.get(sessionId);
        const lastIntent = ctx2.recentIntents[ctx2.recentIntents.length - 1];
        console.log("Last Intent Params:", lastIntent?.params);

        // TEST 3: Pattern Detection (Again) / Suggestion
        console.log("\n--- TEST 3: Pattern (Again) ---");
        await runTurn("Do that again.");

        const lastAudio = audioLog[audioLog.length - 1];
        console.log(`Last Response: "${lastAudio}"`);

        // TEST 4: Urgent Mode
        console.log("\n--- TEST 4: Mode Detection (URGENT) ---");
        await runTurn("This is urgent right now.");

        const ctx4 = contextStore.get(sessionId);
        if (ctx4.mode.current !== UserMode.URGENT) {
            console.warn(`⚠️ Mode Mismatch: Expected URGENT, got ${ctx4.mode.current}`);
        } else {
            console.log("✅ Mode detected as URGENT");
        }

        // TEST 5: Forbidden Word Safety
        console.log("\n--- TEST 5: Forbidden Words Safety ---");
        const forbidden = ["task", "list", "note", "reminder", "tool"];
        const violations = audioLog.filter(t => forbidden.some(w => t.toLowerCase().includes(w)));
        if (violations.length > 0) {
            throw new Error(`FIREWALL BREACH: Found forbidden words in output: ${violations.join(", ")}`);
        }
        console.log("✅ No forbidden words detected in any response.");

        console.log("\n--- VERIFICATION COMPLETE ---");
        process.exit(0);

    } catch (err) {
        console.error("❌ VERIFICATION FAILED:", err);
        process.exit(1);
    }
}

main();
