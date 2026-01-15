
/**
 * Verify Pulse Phase 9: Simulation & Foresight
 * scripts/verify-phase9-simulation.ts
 *
 * Validates:
 * 1. Momentum Fetching during Recall.
 * 2. Simulation Service (Baseline vs Scenarios).
 * 3. Persistence of Simulation Artifacts.
 * 4. Decision Logic using Simulation results.
 */

import { brainOrchestrator } from "../lib/brain/brainOrchestrator";
import { ObservePacket } from "../lib/brain/types";
import { supabaseAdmin } from "../lib/supabase";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function verifyPhase9() {
    console.log("⚡ Verify Pulse Phase 9 (Simulation & Foresight)...");

    // Mock Request Owner
    const ownerId = "test-owner-id"; // Ensure this matches a valid user or handled in mocks

    // 1. Construct Observe Packet (Input)
    const validObserve: ObservePacket = {
        timestamp: new Date().toISOString(),
        channel: 'text',
        raw_text: "I want to start a new project called 'Project Horizon' but I'm worried about time.",
        mode: 'focused',
        current_context: {
            activity: "Planning"
        }
    };

    console.log("--- TEST 1: Full Loop Execution ---");
    let result;
    try {
        result = await brainOrchestrator.runBrainLoop(ownerId, validObserve);
        console.log(`✅ Loop Completed. ID: ${result.loop_id}`);
        console.log(`   Decision: ${result.decision.selected_intent_title}`);
        console.log(`   Confidence: ${result.decision.confidence}`);
        console.log(`   Artifacts: Reasoning=${result.artifacts.reasoning_id}, Sim=${result.artifacts.simulation_id}`);
    } catch (error) { // Type check for Error
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("❌ Loop Execution Failed:", errorMessage);
        process.exit(1);
    }

    console.log("--- TEST 2: Verify Artifacts in DB ---");

    // Verify Simulation Artifact
    const { data: simArtifact, error: simErr } = await supabaseAdmin
        .from('brain_thought_artifacts')
        .select('*')
        .eq('id', result.artifacts.simulation_id)
        .single();

    if (simErr || !simArtifact) {
        console.error("❌ Simulation Artifact Missing!", simErr);
        process.exit(1);
    }

    // Validate Deep Structure
    const simOutput = simArtifact.output;
    if (!simOutput.baseline || !simOutput.scenarios) {
        console.error("❌ Invalid Simulation Output Structure (Missing Baseline/Scenarios)");
        process.exit(1);
    }

    console.log("✅ Simulation Artifact Verified:");
    console.log(`   Baseline: ${simOutput.baseline.summary}`);
    console.log(`   Scenarios: ${simOutput.scenarios.length}`);
    if (simOutput.scenarios.length > 0) {
        console.log(`   Scenario 1: ${simOutput.scenarios[0].intent_title}`);
        console.log(`   Momentum Delta: ${JSON.stringify(simOutput.scenarios[0].momentum_delta)}`);
        console.log(`   Second Order: ${JSON.stringify(simOutput.scenarios[0].second_order_effects)}`);
    }

    console.log("--- TEST 3: Verify Decision Logic ---");
    // Check if decision references simulation
    const { data: decisionRow, error: decErr } = await supabaseAdmin
        .from('brain_decision_intents')
        .select('*')
        .eq('loop_id', result.loop_id)
        .single();

    if (decErr || !decisionRow) {
        console.error("❌ Decision Intent Missing!", decErr);
        process.exit(1);
    }

    const sources: string[] = decisionRow.source_artifact_ids || [];
    if (!sources.includes(simArtifact.id)) {
        console.error("❌ Decision does not link to Simulation Artifact!");
        process.exit(1);
    }

    console.log("✅ Decision correctly references Simulation.");

    console.log("✅ PHASE 9 VERIFICATION SUCCESSFUL");
}

verifyPhase9().catch(err => {
    console.error("Fatal Error:", err);
    process.exit(1);
});
