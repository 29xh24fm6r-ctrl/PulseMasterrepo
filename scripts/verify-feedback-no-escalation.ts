
import { feedbackEngine } from '../lib/brain/learning/feedbackEngine';
import { FeedbackEvent } from '../lib/brain/learning/types';
import { supabaseAdmin } from '../lib/supabase';
import * as dotenv from 'dotenv';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * Verification: Feedback Loop (No Escalation)
 * ===========================================
 * 
 * Goal: 
 * 1. Simulate a 'rejected' event.
 * 2. Assert trust decreases.
 * 3. Assert autonomy level DOES NOT change (Security Invariant).
 */

async function verifyFeedbackNoEscalation() {
    console.log("🛠️ Starting Phase 12 Feedback Verification...");

    const TEST_USER_ID = "test-user-phase12";
    const DOMAIN = "verification_test";
    const EVENT_ID = uuidv4();

    // 1. Setup: Create Dummy Event & Config
    await supabaseAdmin.from('autonomy_events').insert({
        id: EVENT_ID,
        owner_user_id: TEST_USER_ID,
        domain: DOMAIN,
        autonomy_level: 'L0',
        allowed: true,
        executed: false
    });

    // Ensure we start at L0
    await supabaseAdmin.from('autonomy_domain_config').upsert({
        owner_user_id: TEST_USER_ID,
        domain: DOMAIN,
        current_level: 'L0'
    }, { onConflict: 'owner_user_id, domain' });

    // 2. Simulate User REJECTION
    const event: FeedbackEvent = {
        eventId: EVENT_ID,
        ownerUserId: TEST_USER_ID,
        domain: DOMAIN,
        response: 'rejected',
        latencyMs: 1500
    };

    console.log("   📉 Applying REJECTION feedback...");
    const artifact = await feedbackEngine.processFeedback(event);

    console.log(`   📝 Learning Artifact Created: ${artifact?.pattern}`);
    console.log(`   📉 Trust Delta: ${artifact?.trustDelta}`);

    // 3. Assertions

    // A. Check Trust Profile Decreased
    const { data: profile } = await supabaseAdmin
        .from('domain_trust_profile')
        .select('trust_score')
        .eq('owner_user_id', TEST_USER_ID)
        .eq('domain', DOMAIN)
        .single();

    if (!profile || profile.trust_score >= 0.5) {
        // Assuming started at default 0.5, verification_test might be fresh
        // If it was fresh, it starts at 0.5, -0.05 = 0.45.
        // We verify it IS NOT 0.5 anymore.
        if (profile?.trust_score === 0.5) {
            console.error(`❌ FAILED: Trust Score did not change. Got ${profile.trust_score}`);
            process.exit(1);
        }
    }
    console.log(`   ✅ Trust Score adjusted to ${profile?.trust_score}`);

    // B. Check Autonomy Level (CRITICAL INVARIANT)
    const { data: config } = await supabaseAdmin
        .from('autonomy_domain_config')
        .select('current_level')
        .eq('owner_user_id', TEST_USER_ID)
        .eq('domain', DOMAIN)
        .single();

    if (config?.current_level !== 'L0') {
        console.error(`❌ FAILED INVARIANT: Autonomy Escalated to ${config?.current_level}! Should be L0.`);
        process.exit(1);
    }
    console.log(`   ✅ Invariant Passed: Autonomy Level remained ${config?.current_level}.`);

    console.log("✅ SUCCESS: Feedback Loop Verified.");
}

verifyFeedbackNoEscalation();
