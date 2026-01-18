import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = process.cwd();

function checkFileExists(relPath: string) {
    const fullPath = path.join(PROJECT_ROOT, relPath);
    if (!fs.existsSync(fullPath)) {
        throw new Error(`Missing file: ${relPath}`);
    }
    return fs.readFileSync(fullPath, 'utf8');
}

function runStaticVerification() {
    console.log("🟣 Starting Phase 14 Static Verification");

    try {
        // 1. Check Server Logic
        const readinessContent = checkFileExists('lib/delegation/readiness.ts');
        if (!readinessContent.includes('export async function generateReadinessCandidates')) {
            throw new Error("readiness.ts missing generateReadinessCandidates export");
        }
        if (!readinessContent.includes('MAX_SHOW_COUNT') || !readinessContent.includes('COOLDOWN_MINUTES')) {
            throw new Error("readiness.ts missing Rate Limiting constants");
        }
        console.log("✅ Readiness Logic & Rate Limiting Constants Detected");

        // 2. Check Acceptance Logic
        const acceptanceContent = checkFileExists('lib/delegation/acceptReadiness.ts');
        if (!acceptanceContent.includes('acceptReadinessCandidate') || !acceptanceContent.includes('delegation_edges')) {
            throw new Error("acceptReadiness.ts missing logic");
        }
        console.log("✅ Acceptance & Delegation Edge Creation Logic Detected");

        // 3. Check UI Components
        const cardContent = checkFileExists('components/companion/PreDelegationReadyCard.tsx');
        if (!cardContent.includes('PreDelegationReadyCard') || !cardContent.includes('fetchTopCandidateAction')) {
            throw new Error("PreDelegationReadyCard missing core logic");
        }
        console.log("✅ PreDelegationReadyCard Component Detected");

        const shellContent = checkFileExists('components/companion/PulseCompanionShell.tsx');
        if (!shellContent.includes('PreDelegationReadyCard') || !shellContent.includes('useOpeningSignals')) {
            throw new Error("PulseCompanionShell missing Phase 14 integration");
        }
        // Check for Phase 13 Polish which we bundled
        if (!shellContent.includes('PulseAvatar') || !shellContent.includes('Behind the scenes')) {
            throw new Error("PulseCompanionShell missing Phase 13 Polish integration");
        }

        console.log("✅ Companion Shell Integration Verified");

        // 4. Check Migration
        const migrationPath = 'supabase/migrations/20260118_phase14_predictive_predelegation.sql';
        checkFileExists(migrationPath);
        console.log("✅ Migration File Exists");

        console.log("🎉 PHASE 14 VERIFICATION: STATIC CHECKS PASSED ✅");

    } catch (e: any) {
        console.error("❌ Verification Failed:", e.message);
        process.exit(1);
    }
}

runStaticVerification();
