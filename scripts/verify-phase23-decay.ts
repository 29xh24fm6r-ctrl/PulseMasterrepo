
import { decideAutonomyLevel, _setMockClass } from '../lib/brain/autonomy/decideAutonomyLevel';
import { PulseEffect } from '../lib/brain/writeAuthority/types';
import { calculateEligibilityScore } from '../lib/brain/autonomy/scoreEligibility';
import { AutonomyClass } from '../lib/brain/autonomy/types';
import { deriveContextHash, getCurrentContext } from '../lib/brain/autonomy/contextFingerprint';

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
    console.log("🔍 Verifying Phase 23 (Autonomy Decay & Drift)...");

    const classKey = 'tasks:create:struct_status_title';

    // 1. Setup: Extremely Eligible Class (40 successes)
    // 40 / 20 = 2.0 (capped at 1.0)
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
        decay_score: 0,
        context_hash: deriveContextHash(getCurrentContext()) // Dynamic match
    };

    _setMockClass(classKey, mockClass);

    const effect: PulseEffect = {
        domain: 'tasks',
        effectType: 'create',
        payload: { title: 'Routine Task', status: 'pending' },
        confidence: 0.9,
        source: 'daily_run'
    };

    // Pre-flight check
    // We need to override the mocking in decideAutonomyLevel to use our specific mockClass properties if they aren't fully synced
    // But _setMockClass does the job.

    // However, `decideAutonomyLevel` calculates eligibility internally based on stats? 
    // Wait, `decideAutonomyLevel` checks `autonomyClass.eligibilityScore`. 
    // And `scoreEligibility` calculates it. 
    // We should verify `scoreEligibility` output first.

    console.log("\n🧪 Test 1: Baseline Eligibility");
    const score1 = calculateEligibilityScore(mockClass);
    if (score1 !== 1.0) throw new Error(`Expected baseline 1.0, got ${score1}`);
    const decision1 = decideAutonomyLevel(effect);
    if (decision1.autonomyLevel !== 'L1') throw new Error(`Expected L1, got ${decision1.autonomyLevel}`);
    console.log("✅ Baseline confirms L1");


    console.log("\n🧪 Test 2: Apply Massive Decay");
    // Simulate decay score of 0.6. 
    // Score = 1.0 - 0.6 = 0.4. 
    // L1 Threshold is 0.8. Should fail L1.
    mockClass.decay_score = 0.6;
    _setMockClass(classKey, mockClass);

    // We also need to manually update the cached eligibilityScore in the mock object, 
    // because `decideAutonomyLevel` might read the pre-computed property rather than recalculating?
    // Looking at `decideAutonomyLevel.ts`... it checks `autonomyClass.eligibilityScore`.
    // It does NOT re-calculate it on the fly. 
    // Real system would re-calc before calling decide.
    // So we must manually simulate the "Sync" step.
    mockClass.eligibilityScore = calculateEligibilityScore(mockClass);
    console.log(`Debug: Decayed Score is ${mockClass.eligibilityScore}`);

    _setMockClass(classKey, mockClass);

    const decision2 = decideAutonomyLevel(effect);
    if (decision2.autonomyLevel !== 'L0') throw new Error(`Expected L0 (Decayed), got ${decision2.autonomyLevel}`);
    // Reason might constitute "Low Confidence" or similar, since score < 0.8
    console.log(`✅ Decay forced L0 (Reason: ${decision2.decisionReason})`);


    console.log("\n🧪 Test 3: Context Drift");
    // Restore health
    mockClass.decay_score = 0;
    mockClass.eligibilityScore = 1.0;
    // Change stored context hash to mismatch "morning|wd|home" (which is what our mock detector uses as current?)
    // Actually, `detectContextDrift` calls `getCurrentContext()`.
    // We can't easily mock `getCurrentContext` without DI or full mock.
    // BUT, we can see what `getCurrentContext` returns by observing it, or just set the hash to 'IMPOSSIBLE_CONTEXT'.
    mockClass.context_hash = 'IMPOSSIBLE_CONTEXT';
    _setMockClass(classKey, mockClass);

    const decision3 = decideAutonomyLevel(effect);
    if (decision3.autonomyLevel !== 'L0') throw new Error(`Expected L0 (Drift), got ${decision3.autonomyLevel}`);
    if (decision3.decisionReason !== 'CONTEXT_DRIFT') throw new Error(`Expected CONTEXT_DRIFT, got ${decision3.decisionReason}`);
    console.log("✅ Context Drift forced L0");


    console.log("\n🎯 Phase 23 Verification Complete.");
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
