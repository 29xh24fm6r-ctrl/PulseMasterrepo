
import { decideAutonomyLevel, _setMockClass } from '../lib/brain/autonomy/decideAutonomyLevel';
import { PulseEffect } from '../lib/brain/writeAuthority/types';
import { AutonomyClass } from '../lib/brain/autonomy/types';
import { evaluateAutonomyHealth } from '../lib/brain/autonomy/evaluateAutonomyHealth';
import { attemptRecovery } from '../lib/brain/autonomy/attemptRecovery';
import { deriveContextHash, getCurrentContext } from '../lib/brain/autonomy/contextFingerprint';
import { classifyPulseEffect } from '../lib/brain/autonomy/classifyEffect';

// Mock Browser Environment
// @ts-ignore
Object.defineProperty(global, 'navigator', {
    value: { onLine: true, userAgent: 'Bot' },
    writable: true,
    configurable: true
});
// @ts-ignore
global.window = { location: { reload: () => { }, href: '' }, localStorage: { getItem: () => null } };

async function main() {
    console.log("🔍 Verifying Phase 24 (Self-Healing & Auto-Degradation)...");

    const currentContextHash = deriveContextHash(getCurrentContext());
    console.log(`Debug: Current Context Hash is "${currentContextHash}"`);

    const effect: PulseEffect = {
        domain: 'tasks',
        effectType: 'create',
        payload: { title: 'Routine Task', status: 'pending' },
        confidence: 0.9,
        source: 'daily_run'
    };

    const { classKey } = classifyPulseEffect(effect);
    console.log(`Debug: Derived Class Key is "${classKey}"`);

    // 1. Setup: Healthy, Eligible Class
    let mockClass: AutonomyClass = {
        classKey,
        domain: 'tasks',
        effectType: 'create',
        fingerprint: 'test',
        status: 'eligible',
        eligibilityScore: 1.0,
        stats: { successes: 40, confirmations: 0, rejections: 0, reverts: 0, confusionEvents: 0, ippBlocks: 0 },
        user_paused: false,
        decay_score: 0,
        context_hash: currentContextHash,
        health_state: 'healthy',
        recovery_attempts: 0
    };

    _setMockClass(classKey, mockClass);

    // 2. Start Tests


    console.log("\n🧪 Test 1: Baseline Health");
    const decision1 = decideAutonomyLevel(effect);
    if (decision1.autonomyLevel !== 'L1') throw new Error(`Expected L1, got ${decision1.autonomyLevel} (Reason: ${decision1.decisionReason})`);
    console.log("✅ Baseline confirms L1");


    console.log("\n🧪 Test 2: Auto-Degrade on High Decay");
    // Simulate high decay
    mockClass.decay_score = 0.6; // Threshold is 0.5
    // Run evaluation
    const eval1 = evaluateAutonomyHealth(mockClass);
    if (eval1.newHealthState !== 'degraded') throw new Error(`Expected degraded state, got ${eval1.newHealthState}`);
    console.log(`✅ Rule Engine recommends degradation: ${eval1.reason}`);

    // Apply state
    mockClass.health_state = 'degraded';
    _setMockClass(classKey, mockClass);

    // Verify Decision downgrade
    const decision2 = decideAutonomyLevel(effect);
    if (decision2.autonomyLevel !== 'L0') throw new Error(`Expected L0 (Degraded), got ${decision2.autonomyLevel}`);
    if (decision2.decisionReason !== 'HEALTH_DEGRADED') throw new Error(`Expected HEALTH_DEGRADED, got ${decision2.decisionReason}`);
    console.log("✅ Degraded state forces L0");


    console.log("\n🧪 Test 3: Attempt Recovery");
    // In degraded state, we should be able to attempt recovery
    const canRecover = attemptRecovery(mockClass);
    if (!canRecover) throw new Error("Should allow recovery attempt from degraded state");
    console.log("✅ Recovery attempt permitted");


    console.log("\n🧪 Test 4: Auto-Lock on Failure");
    // Simulate confusion/failure
    mockClass.stats.confusionEvents = 10; // Threshold is 5
    mockClass.health_state = 'healthy'; // Reset health to test direct lock rule

    const eval2 = evaluateAutonomyHealth(mockClass);
    if (eval2.newHealthState !== 'locked') throw new Error(`Expected locked state, got ${eval2.newHealthState}`);
    console.log(`✅ Rule Engine recommends lock: ${eval2.reason}`);

    // Apply state
    mockClass.health_state = 'locked';
    _setMockClass(classKey, mockClass);

    // Verify Decision lock
    const decision3 = decideAutonomyLevel(effect);
    if (decision3.autonomyLevel !== 'L0') throw new Error(`Expected L0 (Locked), got ${decision3.autonomyLevel}`);
    if (decision3.decisionReason !== 'HEALTH_LOCKED') throw new Error(`Expected HEALTH_LOCKED, got ${decision3.decisionReason}`);
    console.log("✅ Locked state prevents execution");


    console.log("\n🎯 Phase 24 Verification Complete.");
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
