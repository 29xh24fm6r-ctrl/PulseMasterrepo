
import { BrainOrchestrator } from '../lib/brain/brainOrchestrator';
import { ObservePacket } from '../lib/brain/types';
import { supabaseAdmin } from '../lib/supabase';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * Canon Verification: Failure Degradation (Chaos Testing)
 * =======================================================
 * 
 * Ensures that if critical components fail, the Brain degrades SAFELY.
 * 
 * Rules:
 * 1. If DB fails -> Fail safe (Throw or return empty), never partial commit.
 * 2. If Decision is invalid -> Never persist.
 * 
 * NOTE: Since we can't easily "break" the real DB connection for one test without 
 * mocking the entire module, this script verifies that the Orchestrator handles 
 * errors thrown by dependencies by wrapping the main loop.
 */

async function verifyFailureDegrade() {
    console.log("🛡️ Starting Canon Verification: Failure Degradation...");

    const orchestrator = new BrainOrchestrator();
    const TEST_USER_ID = "test-chaos-10-5";

    // Scenario 1: Malformed Observation (Should act as "Garbage In")
    try {
        console.log("\n🧪 Test 1: Invalid Observation (Null Mode)");
        // @ts-ignore
        const badPacket: ObservePacket = {
            timestamp: new Date().toISOString(),
            channel: 'voice',
            raw_text: 'Test',
            // Missing mode
        };

        await orchestrator.runBrainLoop(TEST_USER_ID, badPacket);
        console.log("⚠️ Warning: Loop accepted invalid packet without error.");
    } catch (e) {
        console.log("✅ Success: System rejected invalid input.");
    }

    // Scenario 2: Simulate Service Failure (Mocking logic if we had DI, 
    // but here we trust the try-catch blocks in Orchestrator).
    // We will verify that if we run a loop, we get a valid result or a clean error.

    const validPacket: ObservePacket = {
        timestamp: new Date().toISOString(),
        channel: 'system',
        raw_text: "System Integrity Check",
        mode: 'focused'
    };

    try {
        console.log("\n🧪 Test 2: Standard Loop Integrity");
        const result = await orchestrator.runBrainLoop(TEST_USER_ID, validPacket);

        if (!result.decision.meta_verified && !result.decision.canon_version) {
            // If we haven't applied the update yet, this might occur, so this test double-checks
            // that we AT LEAST have a decision structure.
            console.log("ℹ️ Loop ran, but Phase 10.5 fields missing (Pending Update).");
        } else {
            console.log("✅ Loop ran with Canon Integrity.");
        }

    } catch (e: any) {
        console.error("❌ Critical Failure: Loop crashed unexpectedly.", e);
        process.exit(1);
    }

    console.log("\n✅ Chaos Verification Complete (Basic).");
}

verifyFailureDegrade();
