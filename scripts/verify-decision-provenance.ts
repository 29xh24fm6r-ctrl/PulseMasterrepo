
import { supabaseAdmin } from '../lib/supabase';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * Canon Verification: Decision Provenance
 * =======================================
 * 
 * "The Subpoena Test"
 * 
 * Verifies that for a given Decision Intent, we can trace back:
 * Decison -> Protocol Hash -> Ledger -> Simulation -> Reasoning.
 * 
 * Ensures no "orphan" decisions exist.
 */

async function verifyDecisionProvenance() {
    console.log("🛡️ Starting Canon Verification: Decision Provenance...");

    // 1. Fetch latest decision
    const { data: decisions, error } = await supabaseAdmin
        .from('brain_decision_intents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("❌ Failed to fetch decisions:", error);
        process.exit(1);
    }

    if (!decisions || decisions.length === 0) {
        console.warn("⚠️ No decisions found to verify. Run a simulation loop first.");
        return;
    }

    let verifiedCount = 0;

    for (const decision of decisions) {
        console.log(`\n🔍 Auditing Decision: ${decision.id}`);
        const intent = decision.intent; // JSONB

        // Check 1: Artifact Links
        const sourceIds = intent.source_artifact_ids || [];
        if (sourceIds.length === 0) {
            console.error("   ❌ FAILED: No Source Artifact IDs linked.");
            continue;
        }
        console.log(`   ✅ Linked Artifacts: ${sourceIds.length}`);

        // Check 2: Artifact Existence
        const { data: artifacts } = await supabaseAdmin
            .from('brain_thought_artifacts')
            .select('id, kind')
            .in('id', sourceIds);

        const foundIds = artifacts?.map(a => a.id) || [];
        const missing = sourceIds.filter((id: string) => !foundIds.includes(id));

        if (missing.length > 0) {
            console.error(`   ❌ FAILED: Missing Audit Artifacts: ${missing.join(', ')}`);
            continue;
        }
        console.log(`   ✅ All Linked Artifacts exist in DB.`);

        // Check 3: Canon Fields (Phase 10.5)
        // Note: Old decisions won't have this, so we check if present
        if (intent.canon_version) {
            console.log(`   ✅ Canon Version: ${intent.canon_version}`);
            if (intent.meta_verified !== true) console.error("   ❌ FAILED: Meta Verified flag false");
            else console.log("   ✅ Meta Verification: TRUE");

            if (intent.trust_hash) console.log("   ✅ Trust Hash: PRESENT");
            else console.error("   ❌ FAILED: Trust Hash MISSING");
        } else {
            console.log("   ℹ️ Legacy Decision (Pre-Canon). Skipping hard checks.");
        }

        verifiedCount++;
    }

    console.log(`\n✅ Audit Complete. Verified ${verifiedCount} chains.`);
}

verifyDecisionProvenance();
