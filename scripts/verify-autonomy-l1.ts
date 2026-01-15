
import { BrainOrchestrator } from '../lib/brain/brainOrchestrator';
import { ObservePacket } from '../lib/brain/types';
import { supabaseAdmin } from '../lib/supabase';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * Verification: L1 Autonomy (Assisted)
 * ====================================
 * 
 * Goal: Prove that when config is L1, the system allows the tool
 * BUT forces 'requires_confirmation = true'.
 */

async function verifyAutonomyL1() {
    console.log("🛠️ Starting Phase 11 Autonomy Verification (L1)...");

    const TEST_USER_ID = "test-user-phase10";

    // 1. Set Config to L1 for 'general' domain
    console.log("   ⚙️ Configuring 'general' domain to L1...");
    const { error } = await supabaseAdmin
        .from('autonomy_domain_config')
        .upsert({
            owner_user_id: TEST_USER_ID,
            domain: 'general',
            current_level: 'L1',
            confidence_threshold: 0.1, // Low threshold to ensure it passes
            is_enabled: true
        }, { onConflict: 'owner_user_id, domain' });

    if (error) {
        console.error("   ❌ Setup Failed:", error);
        process.exit(1);
    }

    const orchestrator = new BrainOrchestrator();

    const input: ObservePacket = {
        timestamp: new Date().toISOString(),
        channel: 'text',
        raw_text: "Create a task called 'L1 Verification Task'.",
        mode: 'focused'
    };

    try {
        const result = await orchestrator.runBrainLoop(TEST_USER_ID, input);

        console.log(`\n🔍 Loop Result ID: ${result.loop_id}`);
        console.log(`   Proposed Step: ${result.decision.proposed_next_step}`);
        console.log(`   Requires Confirmation: ${result.decision.requires_confirmation}`);

        // Assertions
        if (!result.decision.requires_confirmation) {
            console.error("❌ FAILED: L1 Autonomy MUST require confirmation.");
            process.exit(1);
        }

        if (result.decision.confirmation_style !== 'explicit') {
            console.error(`❌ FAILED: Confirmation style should be 'explicit', got '${result.decision.confirmation_style}'`);
            process.exit(1);
        }

        console.log("✅ SUCCESS: L1 Autonomy enforced confirmation.");

    } catch (e: any) {
        console.error("❌ Test Failed:", e);
        process.exit(1);
    }
}

verifyAutonomyL1();
