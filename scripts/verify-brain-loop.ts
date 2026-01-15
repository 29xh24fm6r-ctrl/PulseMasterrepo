import { config } from "dotenv";
config({ path: ".env.local" });

// Hack to handle creating absolute paths for aliased imports if running directly with tsx/ts-node without path mapping
// For simplicity, we assume we are running form root and imports in files are relative or handled by tsconfig-paths.
// But files in `lib/brain/` import from `../supabase`.
// Let's rely on `tsx` handling paths via tsconfig.json.

async function main() {
    console.log("⚡ Verify Pulse Brain Loop (Phase 7)...\n");

    try {
        // Dynamic import to ensure env vars are loaded first
        const { brainOrchestrator } = await import("../lib/brain/brainOrchestrator");
        const { ObservePacketSchema } = await import("../lib/brain/schemas");

        // 1. Mock Input (Observe Packet)
        console.log("--- TEST 1: Construct Observe Packet ---");
        const mockObserve = {
            timestamp: new Date().toISOString(),
            channel: 'system',
            raw_text: "User needs to verify the Brain Orchestrator is working.",
            mode: 'focused',
            current_context: {
                activity: "Verification Testing"
            }
        };

        // Validate Input just to be sure
        const validObserve = ObservePacketSchema.parse(mockObserve);
        console.log("✅ Observe Packet Validated.");

        // 2. Run Loop (Mock Owner ID)
        console.log("\n--- TEST 2: Run Brain Loop ---");
        // Using a fake UUID for owner. 
        // NOTE: If RLS is strictly enforced on INSERT against Auth.JWT, this might fail 
        // unless `supabaseAdmin` (service role) is used in Orchestrator. 
        // `brainOrchestrator.ts` uses `supabaseAdmin`, so it should bypass RLS for inserts.
        const ownerId = "00000000-0000-0000-0000-000000000000";

        const result = await brainOrchestrator.runBrainLoop(ownerId, validObserve as any);

        console.log(`✅ Loop Completed. ID: ${result.loop_id}`);
        console.log(`   Reasoning Artifact: ${result.artifacts.reasoning_id}`);
        console.log(`   Simulation Artifact: ${result.artifacts.simulation_id}`);
        console.log(`   Decision Intent: ${result.decision.selected_intent_title}`);

        // 3. Verify Constraints
        console.log("\n--- TEST 3: Verify Constraints ---");
        if (result.decision.requires_confirmation === undefined) {
            throw new Error("Decision Intent missing confirmation flag.");
        }
        if (result.decision.proposed_next_step.includes("function") || result.decision.proposed_next_step.includes("exec")) {
            // Heuristic check for accidentally leaking code
            console.warn("⚠️  Warning: Proposed step looks technical. Ensure no code leakage.");
        }

        console.log("✅ Loop Result Structure Verified.");
        process.exit(0);

    } catch (err) {
        console.error("❌ VERIFICATION FAILED:", err);
        process.exit(1);
    }
}

main();
