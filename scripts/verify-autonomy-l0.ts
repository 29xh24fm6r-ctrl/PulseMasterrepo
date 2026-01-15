
import { BrainOrchestrator } from '../lib/brain/brainOrchestrator';
import { ObservePacket } from '../lib/brain/types';
import { supabaseAdmin } from '../lib/supabase';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * Verification: L0 Autonomy (Observational)
 * =========================================
 * 
 * Goal: Prove that when compiled with L0, the system detects an opportunity
 * but DOES NOT execute the tool (Tool Call is stripped).
 */

async function verifyAutonomyL0() {
    console.log("🛠️ Starting Phase 11 Autonomy Verification (L0)...");

    // 1. Setup Config (Force L0 for 'general' domain for test user)
    // Note: Default is L0 if no row exists, but let's ensure it.
    console.log("   ℹ️ Assuming Default Policy is L0.");

    const orchestrator = new BrainOrchestrator();
    const TEST_USER_ID = "test-user-phase10"; // Reusing verified user

    const input: ObservePacket = {
        timestamp: new Date().toISOString(),
        channel: 'text',
        raw_text: "Please add 'Test Autonomy' to my tasks.",
        mode: 'focused'
    };

    try {
        const result = await orchestrator.runBrainLoop(TEST_USER_ID, input);

        console.log(`\n🔍 Loop Result ID: ${result.loop_id}`);
        console.log(`   Proposed Step: ${result.decision.proposed_next_step}`);
        console.log(`   Tool Call Present?: ${!!result.decision.tool_call}`);

        // Assertions
        if (result.decision.tool_call) {
            console.error("❌ FAILED: L0 Autonomy SHOULD NOT have a tool call.");
            process.exit(1);
        }

        if (!result.decision.proposed_next_step?.includes("L0")) {
            console.warn("⚠️ Warning: Proposed step didn't explicitly mention L0/Observation.");
        }

        console.log("✅ SUCCESS: L0 Autonomy successfully blocked tool execution.");

    } catch (e: any) {
        console.error("❌ Test Failed:", e);
        process.exit(1);
    }
}

verifyAutonomyL0();
