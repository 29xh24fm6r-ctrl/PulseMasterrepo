
import { decideAutonomyLevel, _setMockClass } from '../lib/brain/autonomy/decideAutonomyLevel';
import { PulseEffect } from '../lib/brain/writeAuthority/types';
import { ELIGIBILITY_SCORE_FOR_L1 } from '../lib/brain/autonomy/eligibilityPolicy';

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
    console.log("🔍 Verifying Phase 22 (Trusted Routines)...");

    const classKey = 'tasks:create:struct_status_title';

    // 1. Setup: Eligible Class
    _setMockClass(classKey, {
        status: 'eligible',
        eligibilityScore: 0.9,
        stats: { successes: 40, confirmations: 0, rejections: 0, reverts: 0, confusionEvents: 0, ippBlocks: 0 },
        user_paused: false
    });

    const effect: PulseEffect = {
        domain: 'tasks',
        effectType: 'create',
        payload: { title: 'Routine Task', status: 'pending' },
        confidence: 0.9,
        source: 'daily_run'
    };

    console.log("\n🧪 Test 1: Normal Eligibility (L1 Upgrade)");
    const decision1 = decideAutonomyLevel(effect);
    if (decision1.autonomyLevel !== 'L1') throw new Error(`Expected L1, got ${decision1.autonomyLevel}`);
    console.log("✅ L1 Upgrade confirmed active");

    console.log("\n🧪 Test 2: User Paused (Downgrade to L0)");
    _setMockClass(classKey, { user_paused: true });

    const decision2 = decideAutonomyLevel(effect);
    if (decision2.autonomyLevel !== 'L0') throw new Error(`Expected L0 (Paused), got ${decision2.autonomyLevel}`);
    if (decision2.decisionReason !== 'USER_PAUSED') throw new Error(`Expected USER_PAUSED reason, got ${decision2.decisionReason}`);
    console.log("✅ User Pause respected (Downgraded)");

    console.log("\n🧪 Test 3: Resume (Restore L1)");
    _setMockClass(classKey, { user_paused: false });
    const decision3 = decideAutonomyLevel(effect);
    if (decision3.autonomyLevel !== 'L1') throw new Error(`Expected L1 (Resumed), got ${decision3.autonomyLevel}`);
    console.log("✅ Resume restored eligibility");


    console.log("\n🎯 Phase 22 Verification Complete.");
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
