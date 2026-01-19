
import fs from 'fs';
import path from 'path';
import { resolveInabilityToProceed } from '../lib/brain/inability/resolve';

async function main() {
    console.log("🔍 Verifying Phase 17.3 (IPP)...");
    const root = process.cwd();

    // 1. Structural Checks
    const files = [
        'lib/brain/inability/types.ts',
        'lib/brain/inability/resolve.ts',
        'lib/brain/inability/actions.ts',
        'components/system/InabilityToProceedCard.tsx',
        'lib/voice/speechAuthority.ts'
    ];

    for (const f of files) {
        if (!fs.existsSync(path.join(root, f))) {
            console.error(`❌ Missing file: ${f}`);
            process.exit(1);
        }
    }
    console.log("✅ All Structural Files Present");

    // 2. Integration Checks
    const bridgePage = fs.readFileSync(path.join(root, 'app/bridge/page.tsx'), 'utf8');
    if (!bridgePage.includes('resolveInabilityToProceed') || !bridgePage.includes('InabilityToProceedCard')) {
        console.error("❌ Bridge Page Integration Missing");
        process.exit(1);
    }
    console.log("✅ Bridge Page Integration Verified");

    // 3. Logic Regression Test
    console.log("🧪 Running Logic Regression Test...");

    // Scenario: Auth Missing
    const missingAuth = resolveInabilityToProceed({
        hasOwnerId: false,
        networkOk: true,
        permissionOk: true
    });

    if (missingAuth?.reason !== 'AUTH_MISSING') {
        console.error(`❌ Auth Missing Scenario Failed. Got: ${missingAuth?.reason}`);
        process.exit(1);
    }

    if (missingAuth.suggestedAction?.action !== 'SET_DEV_USER') {
        console.error(`❌ Auth Missing Action Failed. Got: ${missingAuth.suggestedAction?.action}`);
        process.exit(1);
    }

    console.log("✅ Auth Missing Scenario Passed");

    // Scenario: Network Down
    const netDown = resolveInabilityToProceed({
        hasOwnerId: true,
        networkOk: false,
        permissionOk: true
    });

    if (netDown?.reason !== 'NETWORK_UNAVAILABLE') {
        console.error(`❌ Network Down Scenario Failed. Got: ${netDown?.reason}`);
        process.exit(1);
    }
    console.log("✅ Network Down Scenario Passed");

    console.log("🎯 Phase 17.3 Verification Complete.");
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
