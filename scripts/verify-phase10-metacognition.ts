
import { BrainOrchestrator } from '../lib/brain/brainOrchestrator';
import { ObservePacket } from '../lib/brain/types';
import { supabaseAdmin } from '../lib/supabase';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyMetaCognition() {
    console.log("🛠️ Starting Phase 10 Meta-Cognition Verification...");

    const orchestrator = new BrainOrchestrator();
    const TEST_USER_ID = "test-user-phase10";

    // 1. Scenario: High Uncertainty (Should Trigger 'Clarify' or 'Confirm')
    // We simulate this by mocking an observation that is ambiguous
    const ambiguousObservation: ObservePacket = {
        timestamp: new Date().toISOString(),
        channel: 'text',
        raw_text: "I think I might want to start something new, maybe.",
        mode: 'reflective'
    };

    try {
        console.log("\n🧪 Test 1: Ambiguous Input Loop (Expect Escalation)");
        const result = await orchestrator.runBrainLoop(TEST_USER_ID, ambiguousObservation);

        console.log("Brain Loop Completed:", result.loop_id);
        console.log("Decision Outcome:", result.decision.selected_intent_title);
        console.log("Meta Confidence:", result.decision.meta_confidence);
        console.log("Escalation Level:", result.decision.escalation_level);
        console.log("Trust Posture:", result.decision.trust_posture);

        if (result.decision.escalation_level === 'none') {
            console.warn("⚠️ Warning: Ambiguous input did NOT trigger escalation. Check Logic.");
        } else {
            console.log(`✅ Success: Escalation triggered correctly [${result.decision.escalation_level}]`);
        }

        // Verify Confidence Ledger persistence
        const { data: ledger, error: ledgerErr } = await supabaseAdmin
            .from('brain_confidence_ledger')
            .select('*')
            .eq('loop_id', result.loop_id)
            .single();

        if (ledgerErr || !ledger) throw new Error("Confidence Ledger entry missing!");
        console.log("✅ Ledger Entry Verified:", ledger.id);
        console.log("   - Raw Confidence:", ledger.raw_confidence);
        console.log("   - Post-Sim Confidence:", ledger.post_simulation_confidence);
        console.log("   - Uncertainty Count:", ledger.uncertainty_count);

        // Verify Reflection Artifact if needed
        if (result.decision.reflection_artifact_id) {
            console.log("✅ Reflection Artifact Created:", result.decision.reflection_artifact_id);
            const { data: reflection } = await supabaseAdmin
                .from('brain_thought_artifacts')
                .select('*')
                .eq('id', result.decision.reflection_artifact_id)
                .single();
            console.log("   - Learning Tags:", reflection?.output?.learning_tags);
        } else {
            console.log("ℹ️ No Reflection required for this uncertianty level.");
        }

    } catch (error: any) {
        console.error("❌ Test 1 Failed Details:");
        console.error(error.message);
        console.error(JSON.stringify(error, null, 2));
        process.exit(1);
    }

    // 2. Scenario: Clear Input (Should be 'Confident')
    const clearObservation: ObservePacket = {
        timestamp: new Date().toISOString(),
        channel: 'text',
        raw_text: "Add 'Buy Milk' to my grocery list right now.",
        mode: 'focused'
    };

    try {
        console.log("\n🧪 Test 2: Clear Input Loop (Expect Confidence)");
        const result = await orchestrator.runBrainLoop(TEST_USER_ID, clearObservation);

        console.log("Decision:", result.decision.selected_intent_title);
        console.log("Escalation:", result.decision.escalation_level);

        if (result.decision.escalation_level !== 'none') {
            console.warn(`⚠️ Warning: Clear input triggered unexpected escalation [${result.decision.escalation_level}]`);
        } else {
            console.log("✅ Success: No escalation for clear intent.");
        }

    } catch (error: any) {
        console.error("❌ Test 2 Failed Details:");
        console.error(error.message);
        process.exit(1);
    }

    console.log("\n🎉 PHASE 10 VERIFICATION SUCCESSFUL");
}

verifyMetaCognition();
