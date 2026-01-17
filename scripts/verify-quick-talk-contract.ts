// scripts/verify-quick-talk-contract.ts
import { classifyVoiceIntent } from "@/lib/intent/classifyVoiceIntent";
import { POST } from "@/app/api/voice/quick-talk/start/route";
import { GET } from "@/app/api/runs/[runId]/stream/route";

async function main() {
    console.log("🔍 Verifying Quick Talk Contract...");

    // 1. Check Intent Logic (Safe Import)
    try {
        const intent = classifyVoiceIntent({ transcript: "contact oracle" });
        if (intent.type !== "RUN_ORACLE") throw new Error("Intent classification failed basic test");
        console.log("✅ Intent Classification module imported and functional");
    } catch (e) {
        console.error("❌ Intent Classification check failed", e);
        process.exit(1);
    }

    // 2. Check Route Imports (No Top-Level Env Crashes)
    if (typeof POST !== "function") {
        console.error("❌ Quick Talk Start POST handler missing");
        process.exit(1);
    }
    console.log("✅ Quick Talk Start API imported safely");

    if (typeof GET !== "function") {
        console.error("❌ Run Stream GET handler missing");
        process.exit(1);
    }
    console.log("✅ Run Stream API imported safely");

    console.log("✅ CONTRACT VERIFIED: Modules safe for runtime.");
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
