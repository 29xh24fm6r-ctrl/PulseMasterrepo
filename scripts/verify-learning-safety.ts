
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY; // Must be admin/service role to bypass RLS for setup

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials in environment.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TEST_USER_ID = '00000000-0000-0000-0000-000000000000'; // Dummy UUID
const TEST_INTENT = 'test_learning_verification';

async function main() {
    console.log('🔍 Starting Phase 12 Verification: Learning Safety...');

    try {
        // 1. Setup: Clean previous test data and create base autonomy score
        await supabase.from('learning_artifacts').delete().eq('owner_user_id', TEST_USER_ID);
        await supabase.from('autonomy_scores').delete().eq('owner_user_id', TEST_USER_ID).eq('intent_type', TEST_INTENT);

        // Create initial score
        const { error: insertError } = await supabase.from('autonomy_scores').insert({
            owner_user_id: TEST_USER_ID,
            intent_type: TEST_INTENT,
            confidence_score: 0.5,
            autonomy_level: 'l0'
        });

        if (insertError) throw new Error(`Setup failed: ${insertError.message}`);
        console.log('✅ Setup: Initial autonomy score created (0.5).');

        // 2. Action: Create a Learning Artifact (System Logic)
        // This simulates the Workflow Worker suggesting an increase
        const { data: artifact, error: artifactError } = await supabase.from('learning_artifacts').insert({
            owner_user_id: TEST_USER_ID,
            source_type: 'workflow_outcome',
            source_id: '00000000-0000-0000-0000-000000000001',
            signal_type: 'success',
            confidence_delta: 0.1,
            metadata_json: { intent: TEST_INTENT, reasoning: 'Verification Test' }
        }).select().single();

        if (artifactError) throw new Error(`Artifact creation failed: ${artifactError.message}`);
        console.log('✅ Action: Learning Artifact created (Delta: +0.1).');

        // 3. Verification: Ensure Autonomy Score DID NOT Change Automatically
        // Sleep briefly to ensure no async triggers (though there are none, we verify invariant)
        await new Promise(r => setTimeout(r, 1000));

        const { data: checkScore } = await supabase
            .from('autonomy_scores')
            .select('confidence_score')
            .eq('owner_user_id', TEST_USER_ID)
            .eq('intent_type', TEST_INTENT)
            .single();

        if (checkScore?.confidence_score !== 0.5) {
            throw new Error(`❌ SAFETY FAILURE: Confidence score changed automatically! Got ${checkScore?.confidence_score}`);
        }
        console.log('✅ Invariant Passed: Learning Artifact did NOT auto-apply changes.');

        // 4. Action: Simulate User Acceptance (Explicit Action)
        const newConfidence = 0.5 + artifact.confidence_delta;

        // This replicates the logic in `actions.ts`
        const { error: updateError } = await supabase
            .from('autonomy_scores')
            .update({ confidence_score: newConfidence })
            .eq('owner_user_id', TEST_USER_ID)
            .eq('intent_type', TEST_INTENT);

        if (updateError) throw new Error(`User acceptance simulation failed: ${updateError.message}`);

        // Mark as accepted (simulated)
        await supabase.from('learning_artifacts').insert({
            owner_user_id: TEST_USER_ID,
            source_type: 'user_feedback',
            source_id: artifact.id,
            signal_type: 'success',
            confidence_delta: 0,
            metadata_json: { action: 'accepted_tuning' }
        });

        // 5. Final Verification
        const { data: finalScore } = await supabase
            .from('autonomy_scores')
            .select('confidence_score')
            .eq('owner_user_id', TEST_USER_ID)
            .eq('intent_type', TEST_INTENT)
            .single();

        if (finalScore?.confidence_score !== 0.6) {
            throw new Error(`❌ Logic Failure: Score did not update correctly. Expected 0.6, got ${finalScore?.confidence_score}`);
        }
        console.log('✅ Logic Passed: Explicit user acceptance updated the score.');

        // Cleanup
        await supabase.from('learning_artifacts').delete().eq('owner_user_id', TEST_USER_ID);
        await supabase.from('autonomy_scores').delete().eq('owner_user_id', TEST_USER_ID).eq('intent_type', TEST_INTENT);
        console.log('✅ Cleanup complete.');

        console.log('\n🎉 PHASE 12 VERIFICATION: GREEN CHECK ✅');

    } catch (err: any) {
        console.error('\n❌ VERIFICATION FAILED:', err.message);
        process.exit(1);
    }
}

main();
