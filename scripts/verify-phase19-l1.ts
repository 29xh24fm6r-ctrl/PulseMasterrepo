
import { executePulseEffect } from '../lib/brain/writeAuthority/executePulseEffect';
import { PulseEffect } from '../lib/brain/writeAuthority/types';
import { _setMockClass } from '../lib/brain/autonomy/decideAutonomyLevel';
import { MIN_SUCCESSES_FOR_ELIGIBLE, ELIGIBILITY_SCORE_FOR_L1, L1_CONFIRM_DOWNGRADE_THRESHOLD } from '../lib/brain/autonomy/eligibilityPolicy';

// Mock Browser Environment
// @ts-ignore
Object.defineProperty(global, 'navigator', {
    value: { onLine: true, userAgent: 'Bot' },
    writable: true,
    configurable: true
});
// @ts-ignore
global.window = {
    location: { reload: () => { }, href: '' },
    localStorage: { getItem: () => null },
    speechSynthesis: { cancel: () => { }, speak: () => { } }
};
// @ts-ignore
global.SpeechSynthesisUtterance = class { };


async function main() {
    console.log("🔍 Verifying Phase 19 (L1 Autonomy)...");

    // 1. Setup Test Effect (Confirm Level Confidence)
    // 0.75 is typically "confirm" in OWA (0.6 - 0.85)
    // But if >= 0.7 (L1_CONFIRM_DOWNGRADE_THRESHOLD) it can be upgraded to auto if L1 enabled.
    const confirmEffect: PulseEffect = {
        domain: 'tasks',
        effectType: 'create',
        payload: { title: 'L1 Test Task' },
        confidence: 0.75,
        source: 'daily_run'
    };

    const classKey = 'tasks:create:struct_title'; // Based on our simple classifier

    console.log(`\n🧪 Class Key: ${classKey}`);

    // 2. Test Locked Class (Should remain Confirm)
    console.log("\n🧪 Testing Locked Class...");
    // Reset mock
    _setMockClass(classKey, { status: 'locked', eligibilityScore: 0, stats: { successes: 0, confirmations: 0, rejections: 0, reverts: 0, confusionEvents: 0, ippBlocks: 0 } });

    const resLocked = await executePulseEffect(confirmEffect, 'user-1');
    // @ts-ignore
    if (resLocked.writeMode !== 'confirm' || resLocked.autonomyLevel !== 'L0') {
        // @ts-ignore
        throw new Error(`❌ Locked class upgraded incorrectly: ${resLocked.writeMode} / ${resLocked.autonomyLevel}`);
    }
    console.log("✅ Locked Class -> Confirm (No Upgrade)");


    // 3. Test Eligible Class (Should Upgrade to Auto)
    console.log("\n🧪 Testing Eligible Class (L1 Upgrade)...");
    // Seed mock as eligible with high score (Needs enough stats to pass recalc)
    // Score = successes / (successes + 10). 40 / 50 = 0.8 > 0.75
    _setMockClass(classKey, {
        status: 'eligible',
        eligibilityScore: 0.8,
        stats: { successes: 40, confirmations: 0, rejections: 0, reverts: 0, confusionEvents: 0, ippBlocks: 0 }
    });

    const resL1 = await executePulseEffect(confirmEffect, 'user-1');
    // @ts-ignore
    if (resL1.writeMode !== 'auto' || resL1.autonomyLevel !== 'L1') {
        // @ts-ignore
        throw new Error(`❌ Eligible class failed upgrade: ${resL1.writeMode} / ${resL1.autonomyLevel}`);
    }
    console.log("✅ Eligible Class -> Auto (L1 Upgrade)");


    // 4. Test Paused Class (Should Not Upgrade)
    console.log("\n🧪 Testing Paused Class...");
    _setMockClass(classKey, { status: 'paused', eligibilityScore: 0 }); // Score irrelevant if paused

    const resPaused = await executePulseEffect(confirmEffect, 'user-1');
    // @ts-ignore
    if (resPaused.writeMode !== 'confirm' || resPaused.autonomyLevel !== 'L0') {
        // @ts-ignore
        throw new Error(`❌ Paused class upgraded incorrectly: ${resPaused.writeMode}`);
    }
    console.log("✅ Paused Class -> Confirm (No Upgrade)");


    // 5. Test IPP Block
    console.log("\n🧪 Testing IPP Precedence...");
    const resBlocked = await executePulseEffect(confirmEffect, ''); // No owner = IPP Block
    if (resBlocked.success) {
        throw new Error("❌ IPP failed to block L1 candidate");
    }
    console.log("✅ IPP Blocked Execution");

    console.log("\n🎯 Phase 19 Verification Complete.");
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
